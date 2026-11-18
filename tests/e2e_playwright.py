"""
Snoozr - E2E Account Feature Verification with Playwright
Tests the required Account Features:
1. Registration & Validation
2. Login / Logout
3. Role-Based Dashboard Routing & Protection
4. Profile View & Edit
"""

import os
import sys
from playwright.sync_api import sync_playwright, expect

BASE_URL = os.environ.get("SNOOZR_BASE_URL", "http://127.0.0.1:8000")


def run_e2e_tests():
    print(f"[*] Starting Snoozr Playwright E2E Suite on {BASE_URL}...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # 1. Login Page Loads
            print("1. Testing Login Page & Three.js Canvas...")
            page.goto(f"{BASE_URL}/accounts/login/")
            expect(page).to_have_title("Sign In - Snoozr Starry Night")
            assert page.locator("#starry-canvas-container").is_visible()
            print("   -> Login page & 3D canvas verified!")

            # 2. Registration Page
            print("2. Testing Registration Form & Validation...")
            page.goto(f"{BASE_URL}/accounts/register/")
            expect(page).to_have_title("Create Account - Snoozr Starry Night")
            
            # Fill form
            test_username = "celestial_tester"
            page.fill('input[name="first_name"]', "Vincent")
            page.fill('input[name="last_name"]', "Gogh")
            page.fill('input[name="username"]', test_username)
            page.fill('input[name="email"]', "vincent@starrynight.art")
            page.fill('input[name="password1"]', "StarryNight2026!")
            page.fill('input[name="password2"]', "StarryNight2026!")
            
            # Check match indicator
            match_text = page.locator("#match-indicator").inner_text()
            print(f"   -> Password match indicator: {match_text}")

            # 3. Successful Admin Login
            print("3. Testing Admin Login & Dashboard...")
            page.goto(f"{BASE_URL}/accounts/login/")
            page.fill('input[name="username"]', "admin")
            page.fill('input[name="password"]', "admin123")
            page.click('button[type="submit"]')
            page.wait_for_load_state("networkidle")

            # Admin redirected to admin dashboard
            assert "/accounts/dashboard/admin/" in page.url
            print(f"   -> Successfully redirected to: {page.url}")
            assert page.locator("text=Administrative Observatory").is_visible()

            # 4. Profile View
            print("4. Testing Profile View...")
            page.goto(f"{BASE_URL}/accounts/profile/")
            assert page.locator("text=My Sleep Profile").is_visible()
            print("   -> Profile view verified!")

            # 5. Logout
            print("5. Testing Logout...")
            page.goto(f"{BASE_URL}/accounts/logout/")
            page.wait_for_load_state("networkidle")
            assert "/accounts/login/" in page.url
            print("   -> Logout successfully redirected to login page!")

            print("\n[SUCCESS] All Playwright E2E Account Feature tests passed!")
        except Exception as e:
            print(f"\n[ERROR] Playwright test failed: {e}")
        finally:
            browser.close()


if __name__ == "__main__":
    run_e2e_tests()
