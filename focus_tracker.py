#!/usr/bin/env python3
"""
Focus Tracker - Monitor app/website usage and warn about unproductive activity
Integrates with Supabase focus_apps table for productivity tracking
"""

import time
import subprocess
import os
import sys
from typing import Optional, Dict, Set
from urllib.parse import urlparse
from datetime import datetime
import logging

# Set up file logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(os.getcwd(), 'focus_tracker.log')),
        logging.StreamHandler(sys.stdout)
    ]
)

try:
    from supabase import create_client, Client
except ImportError:
    print("ERROR: supabase-py not installed. Run: pip install supabase")
    sys.exit(1)

# Configuration - Load from environment or .env file
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
USER_ID = os.getenv("SLATE_USER_ID")  # Your user_id from Supabase auth.users table

# Fallback defaults (can be overridden in config.py)
DEFAULT_PRODUCTIVE = {
    "com.microsoft.VSCode",
    "com.apple.dt.Xcode",
    "com.jetbrains.pycharm",
    "localhost:3000",
    "localhost:5173",
    "github.com",
}

DEFAULT_UNPRODUCTIVE = {
    "chatgpt.com",
    "com.spotify.client",
    "instagram.com",
    "twitter.com",
    "reddit.com",
    "youtube.com",
    "netflix.com",
}

class FocusTracker:
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            print("ERROR: Missing Supabase credentials in environment variables")
            print("Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY")
            sys.exit(1)

        if not USER_ID:
            print("WARNING: SLATE_USER_ID not set. Run with --help for setup instructions")
            print("Continuing with local tracking only (no database sync)")

        self.supabase: Optional[Client] = None
        self.user_id = USER_ID
        self.productive_items: Set[str] = set(DEFAULT_PRODUCTIVE)
        self.unproductive_items: Set[str] = set(DEFAULT_UNPRODUCTIVE)
        self.unknown_items: Set[str] = set()  # Track unknown items to avoid repeated prompts

        # State tracking
        self.last_app: Optional[str] = None
        self.last_domain: Optional[str] = None
        self.current_start_time: Optional[datetime] = None
        self.current_item: Optional[str] = None
        self.current_category: Optional[str] = None
        self.is_timer_active: bool = False
        self.last_warning_item: Optional[str] = None
        self.last_warning_time: Optional[datetime] = None
        self.last_prompt_item: Optional[str] = None
        self.last_prompt_time: Optional[datetime] = None
        self.session_items: list = []  # Track items visited this session

        # Initialize Supabase connection
        if self.user_id:
            try:
                self.supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
                self._load_focus_apps()
                print(f"Focus Tracker ready for user: {self.user_id}")
            except Exception as e:
                print(f"WARNING: Failed to connect to Supabase: {e}")
                print("Continuing with local defaults only")

    def _load_focus_apps(self):
        """Load productive/unproductive apps from Supabase focus_apps table"""
        if not self.supabase or not self.user_id:
            return

        try:
            response = self.supabase.table("focus_apps") \
                .select("name, category") \
                .eq("user_id", self.user_id) \
                .execute()

            # Clear existing lists to avoid duplicates
            new_productive = set(DEFAULT_PRODUCTIVE)
            new_unproductive = set(DEFAULT_UNPRODUCTIVE)

            if response.data:
                for item in response.data:
                    name = item["name"].lower()
                    if item["category"] == "productive":
                        new_productive.add(name)
                    elif item["category"] == "unproductive":
                        new_unproductive.add(name)

                # Update instance variables
                self.productive_items = new_productive
                self.unproductive_items = new_unproductive
        except Exception:
            pass

    def _check_timer_status(self) -> bool:
        """Check if user's timer is currently active"""
        if not self.supabase or not self.user_id:
            return False

        try:
            response = self.supabase.table("user_status") \
                .select("is_active, current_seconds") \
                .eq("user_id", self.user_id) \
                .execute()

            if response.data and len(response.data) > 0:
                status = response.data[0]
                is_active = status.get("is_active", False)
                print(f"Timer: {'ACTIVE' if is_active else 'inactive'}")
                return is_active

            return False
        except Exception:
            return False

    def get_base_domain(self, url: str) -> Optional[str]:
        """Extract base domain from URL"""
        if not url:
            return None
        try:
            host = urlparse(url).netloc.lower()
            if not host:
                host = urlparse("https://" + url).netloc.lower()
            if host.startswith("www."):
                host = host[4:]
            return host or None
        except Exception:
            return None

    def osascript(self, script: str) -> str:
        """Execute AppleScript and return output"""
        try:
            out = subprocess.check_output(["osascript", "-e", script], text=True)
            return out.strip()
        except Exception:
            return ""

    def get_front_bundle_id(self) -> str:
        """Get bundle ID of frontmost application"""
        script = (
            'tell application "System Events" '
            'to get bundle identifier of first application process whose frontmost is true'
        )
        return self.osascript(script)

    def get_browser_url(self, app_name: str) -> Optional[str]:
        """Get current URL from Safari or Chrome"""
        try:
            if app_name == "com.apple.Safari":
                return self.osascript(
                    'tell application "Safari"\n'
                    'if not (exists front window) then return ""\n'
                    'try\n'
                    'set theURL to URL of current tab of front window\n'
                    'if theURL is not missing value and theURL is not "" then return theURL\n'
                    'end try\n'
                    'return ""\n'
                    'end tell'
                )
            elif app_name == "com.google.Chrome":
                return self.osascript(
                    'tell application "Google Chrome"\n'
                    'if not (exists front window) then return ""\n'
                    'set theTab to active tab of front window\n'
                    'if theTab is missing value then return ""\n'
                    'return URL of theTab\n'
                    'end tell'
                )
        except Exception:
            return None
        return None

    def categorize(self, item: str) -> str:
        """Categorize app or domain as productive, unproductive, or unknown"""
        item_lower = item.lower()

        if item_lower in self.productive_items:
            return "productive"
        elif item_lower in self.unproductive_items:
            return "unproductive"
        else:
            return "unknown"

    def show_warning(self, item: str, item_type: str):
        """Display macOS notification for unproductive app/website"""
        # Check if we've already shown this warning recently (within 2 seconds)
        now = datetime.now()
        if self.last_warning_item == item and self.last_warning_time:
            time_since = (now - self.last_warning_time).total_seconds()
            if time_since < 2.0:
                return

        title = "⚠️ Unproductive Activity Detected"
        message = f"You're using {item_type}: {item}"

        try:
            subprocess.run([
                "osascript", "-e",
                f'display notification "{message}" with title "{title}" sound name "Funk"'
            ], check=False)
            self.last_warning_item = item
            self.last_warning_time = now
        except Exception:
            pass

    def prompt_unknown_app(self, item: str, item_type: str):

        # Use osascript for macOS dialog
        try:
            script = f'''
            display dialog "Unknown {item_type}: {item}\\n\\nAdd to productive or unproductive list?" buttons {{"Skip", "Unproductive", "Productive"}} default button "Skip" with title "Focus Tracker"
            '''
            result = subprocess.check_output(["osascript", "-e", script], text=True).strip()

            if "Productive" in result:
                return "productive"
            elif "Unproductive" in result:
                return "unproductive"
            else:
                return "skip"
        except Exception:
            # Fallback to console input
            choice = input("Choice [p/u/s]: ").lower().strip()
            if choice == "p":
                return "productive"
            elif choice == "u":
                return "unproductive"
            else:
                return "skip"

    def prompt_stop_timer(self, item: str, item_type: str):

        try:
            script = f'''
            display dialog "⚠️ Unproductive {item_type}: {item}\\n\\nYour timer is running. Would you like to pause it?" buttons {{"No", "Yes, Pause Timer"}} default button "Yes, Pause Timer" with title "Focus Tracker"
            '''
            result = subprocess.check_output(["osascript", "-e", script], text=True).strip()

            if "Yes" in result:
                return True
            return False
        except Exception:
            choice = input("Pause timer? [y/n]: ").lower().strip()
            return choice == "y"

    def pause_user_timer(self):
        """Pause the user's timer in Supabase"""
        if not self.supabase or not self.user_id:
            return False

        try:
            # Set is_active to false - frontend will detect via realtime subscription
            self.supabase.table("user_status") \
                .update({"is_active": False, "external_stop": True}) \
                .eq("user_id", self.user_id) \
                .execute()

            return True
        except Exception:
            return False

    def add_app_to_database(self, item: str, category: str):
        """Add app/website to focus_apps table"""
        if not self.supabase or not self.user_id:
            print("Cannot add app: No database connection")
            return False

        try:
            self.supabase.table("focus_apps") \
                .insert({
                    "user_id": self.user_id,
                    "name": item,
                    "category": category
                }) \
                .execute()

            # Update local cache
            if category == "productive":
                self.productive_items.add(item.lower())
            else:
                self.unproductive_items.add(item.lower())

            return True
        except Exception:
            return False

    def track_item(self, item: str, item_type: str):
        """Track a new app or domain"""
        category = self.categorize(item)
        categorized_now = False

        # Handle unknown apps - prompt to categorize (only when timer is active)
        if category == "unknown" and item.lower() not in self.unknown_items and self.is_timer_active:
            choice = self.prompt_unknown_app(item, item_type)

            if choice in ("productive", "unproductive"):
                if self.add_app_to_database(item, choice):
                    category = choice
                    categorized_now = True
                    # Reload apps immediately to update local cache
                    self._load_focus_apps()
            else:
                # Mark as seen so we don't prompt again
                self.unknown_items.add(item.lower())

        # Handle unproductive apps when timer is active
        if category == "unproductive" and self.is_timer_active:
            # Check if this is a new item AND we haven't warned about it recently
            now = datetime.now()
            should_show_prompt = False

            # Avoid an immediate second dialog if the item was just categorized
            if categorized_now:
                self.last_prompt_item = item
                self.last_prompt_time = now
            # Only prompt if this is a different item from the current one
            elif self.current_item != item:
                # Also check we haven't just prompted about this item (double-check for race conditions)
                if self.last_prompt_item != item or not self.last_prompt_time:
                    should_show_prompt = True
                elif (now - self.last_prompt_time).total_seconds() >= 2.0:
                    should_show_prompt = True

            if should_show_prompt:
                if self.prompt_stop_timer(item, item_type):
                    print(f"⚠️  Sending pause signal for: {item}")
                    if self.pause_user_timer():
                        self.is_timer_active = False
                    else:
                        print(f"❌ Failed to pause timer")
                else:
                    print(f"ℹ️  User declined to pause")
                self.last_prompt_item = item
                self.last_prompt_time = now

        # Update tracking state
        self.current_item = item
        self.current_category = category
        self.current_start_time = datetime.now()

    def run(self):
        """Main tracking loop"""
        print("\nFocus Tracker - Monitoring activity")
        print("Press Ctrl+C to stop\n")

        app_change = False
        timer_check_counter = 0
        app_reload_counter = 0
        TIMER_CHECK_INTERVAL = 2  # Check timer status every 2 seconds (2 * 1s)
        APP_RELOAD_INTERVAL = 5  # Reload apps from DB every 5 seconds (5 * 1s)

        try:
            while True:
                # Check timer status periodically
                timer_check_counter += 1
                if timer_check_counter >= TIMER_CHECK_INTERVAL:
                    timer_check_counter = 0
                    self.is_timer_active = self._check_timer_status()

                # Reload apps from database periodically to pick up web UI changes
                app_reload_counter += 1
                if app_reload_counter >= APP_RELOAD_INTERVAL:
                    app_reload_counter = 0
                    self._load_focus_apps()

                app = self.get_front_bundle_id()

                # Track app changes regardless of timer state
                if app != self.last_app:
                    if app not in ("com.apple.Safari", "com.google.Chrome"):
                        self.track_item(app, "app")
                    self.last_app = app
                    app_change = True

                # Track browser URLs
                try:
                    url = self.get_browser_url(app)
                    domain = self.get_base_domain(url or "")

                    if domain and (domain != self.last_domain or app_change):
                        self.track_item(domain, "website")
                        self.last_domain = domain
                        app_change = False
                except Exception:
                    pass

                time.sleep(1.0)

        except KeyboardInterrupt:
            print("\nStopping focus tracker...")

def print_help():
    """Print setup instructions"""
    print("""
Focus Tracker - Setup Instructions

1. Install dependencies:
   pip install supabase

2. Set environment variables in your shell profile (~/.zshrc or ~/.bash_profile):
   export NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
   export NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   export SLATE_USER_ID="your-user-id-from-auth-users-table"

3. Run the tracker:
   python focus_tracker.py

4. Configure productive/unproductive apps:
   - Use the Focus tracking feature in the Clock page (http://localhost:3000/clock)
   - Or edit DEFAULT_PRODUCTIVE and DEFAULT_UNPRODUCTIVE in this file

Tips:
- The script monitors your active app/window every 0.5 seconds
- Warnings appear as macOS notifications for unproductive apps
- App/domain names are matched case-insensitively
- Browser URLs are tracked by domain (e.g., github.com, reddit.com)
""")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ("--help", "-h"):
        print_help()
        sys.exit(0)

    tracker = FocusTracker()
    tracker.run()
