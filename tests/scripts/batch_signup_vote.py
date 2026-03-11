import time
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

# Configuration
TARGET_URL = "http://localhost:8083"
USER_COUNT = 14
BASE_EMAIL = "firstlast{}@example.com"
PASSWORD = "password123"

def run_batch_signup():
    print(f"[Test] Starting UI Automation for {USER_COUNT} users...")
    
    options = webdriver.ChromeOptions()
    # options.add_argument("--headless") 
    options.add_argument(f"--user-data-dir={os.path.join(os.getcwd(), 'chrome-data')}")
    options.add_argument("--disable-extensions")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    try:
        
        # Force webdriver_manager to install to local folder
        os.environ['WDM_LOCAL'] = '1'
        os.environ['WDM_SSL_VERIFY'] = '0'

        from webdriver_manager.chrome import ChromeDriverManager
        from selenium.webdriver.chrome.service import Service as ChromeService

        # Install driver
        service = ChromeService(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
    except Exception as e:
        print(f"[Error] Failed to launch Chrome: {e}")
        print("Ensure you have Chrome installed.")
        return

    wait = WebDriverWait(driver, 10)

    for i in range(1, USER_COUNT + 1):
        email = BASE_EMAIL.format(i)
        first_name = f"First{i}"
        last_name = f"Last{i}"
        
        print(f"\n[User {i}/{USER_COUNT}] Processing {email}...")
        
        try:
            # 1. Go to URL
            driver.get(TARGET_URL)
            
            # Check for existing logout (if previous session stuck)
            try:
                logout_btns = driver.find_elements(By.XPATH, "//div[contains(text(), 'Logout')]")
                if logout_btns:
                    logout_btns[0].click()
                    time.sleep(1)
            except:
                pass

            # 2. Navigate to Sign Up
            # Wait for email input to know page loaded
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder='Email']")))
            
            # Click "Sign Up" toggle if present (it's a div text)
            # We assume we are on Login by default.
            # Find the toggle that says "Sign Up"
            try:
                toggles = driver.find_elements(By.TAG_NAME, "div")
                for t in toggles:
                    if t.text == "Sign Up":
                        t.click()
                        break
            except:
                pass
            
            # 3. Fill Form
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder='First Name']"))).send_keys(first_name)
            driver.find_element(By.CSS_SELECTOR, "input[placeholder='Last Name']").send_keys(last_name)
            driver.find_element(By.CSS_SELECTOR, "input[placeholder='Email']").send_keys(email)
            driver.find_element(By.CSS_SELECTOR, "input[placeholder='Password']").send_keys(PASSWORD)
            
            # 4. Submit
            # Find the submit button (div/button with text "Sign Up")
            # Usually the last one or by style. Let's look for exact text match.
            submit_btns = driver.find_elements(By.XPATH, "//div[@role='button']//div[contains(text(), 'Sign Up')]")
            # Parent of that div
            if submit_btns:
                 # Go up to the button role
                 submit_btns[0].find_element(By.XPATH, "./..").click()
            else:
                 # Fallback for direct button
                 driver.find_element(By.XPATH, "//div[@role='button'][descendant::text()='Sign Up']").click()
            
            # 5. Wait for Home Screen
            # Look for "TAP TO JOIN" or "GameID"
            wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'TAP TO JOIN') or contains(text(), 'GameID')]")))
            print("  - Signed up/Logged in.")

            # 6. Vote
            try:
                vote_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'TAP TO JOIN')]")))
                vote_btn.click()
                print("  - Clicked Vote.")
                
                # Handle Alert if any
                try:
                    WebDriverWait(driver, 3).until(EC.alert_is_present())
                    alert = driver.switch_to.alert
                    alert.accept()
                    print("  - Accepted Alert.")
                except TimeoutException:
                    pass
                    
                time.sleep(2) # Wait for write
            except TimeoutException:
                 print("  - 'TAP TO JOIN' not found (maybe already voted).")

            # 7. Logout
            try:
                logout = wait.until(EC.element_to_be_clickable((By.XPATH, "//div[contains(text(), 'Logout')]")))
                logout.click()
                print("  - Logged out.")
                time.sleep(1)
            except:
                print("  - Logout failed.")

        except Exception as e:
            print(f"  [!] Failed: {e}")
            
    print("\n[Test] Automation Complete.")
    driver.quit()

if __name__ == "__main__":
    run_batch_signup()
