import requests
import sys
import json
from datetime import datetime

class MilkDeliveryAPITester:
    def __init__(self, base_url="https://dairyexpress.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.delivery_person_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_person_id = None
        self.created_delivery_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except:
                    self.log_test(name, True, f"Status: {response.status_code} (No JSON response)")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {error_data}")
                except:
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_init_admin(self):
        """Test admin initialization"""
        return self.run_test("Initialize Admin", "POST", "init-admin", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            return True
        return False

    def test_delivery_person_creation(self):
        """Test creating a delivery person"""
        if not self.admin_token:
            self.log_test("Create Delivery Person", False, "No admin token available")
            return False

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        person_data = {
            "name": "Test Delivery Person",
            "phone": "9876543210",
            "pincode": "123456",
            "password": "testpass123"
        }
        
        success, response = self.run_test(
            "Create Delivery Person",
            "POST",
            "admin/delivery-persons",
            200,
            data=person_data,
            headers=headers
        )
        
        if success and 'id' in response:
            self.created_person_id = response['id']
            return True
        return False

    def test_get_delivery_persons(self):
        """Test getting delivery persons list"""
        if not self.admin_token:
            self.log_test("Get Delivery Persons", False, "No admin token available")
            return False

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "Get Delivery Persons",
            "GET",
            "admin/delivery-persons",
            200,
            headers=headers
        )[0]

    def test_delivery_person_login(self):
        """Test delivery person login"""
        success, response = self.run_test(
            "Delivery Person Login",
            "POST",
            "login",
            200,
            data={"username": "9876543210", "password": "testpass123"}
        )
        if success and 'access_token' in response:
            self.delivery_person_token = response['access_token']
            return True
        return False

    def test_delivery_person_profile(self):
        """Test getting delivery person profile"""
        if not self.delivery_person_token:
            self.log_test("Get Delivery Person Profile", False, "No delivery person token available")
            return False

        headers = {'Authorization': f'Bearer {self.delivery_person_token}'}
        return self.run_test(
            "Get Delivery Person Profile",
            "GET",
            "delivery-person/profile",
            200,
            headers=headers
        )[0]

    def test_create_delivery(self):
        """Test creating a delivery"""
        if not self.admin_token or not self.created_person_id:
            self.log_test("Create Delivery", False, "No admin token or person ID available")
            return False

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        delivery_data = {
            "delivery_person_id": self.created_person_id,
            "customer_name": "Test Customer",
            "customer_address": "123 Test Street, Test City",
            "customer_phone": "9876543211",
            "customer_whatsapp": "9876543211",
            "customer_pincode": "123456",
            "product_name": "Fresh Milk",
            "product_quantity": "2 Liters",
            "delivery_date": datetime.now().strftime("%Y-%m-%d")
        }
        
        success, response = self.run_test(
            "Create Delivery",
            "POST",
            "admin/deliveries",
            200,
            data=delivery_data,
            headers=headers
        )
        
        if success and 'id' in response:
            self.created_delivery_id = response['id']
            return True
        return False

    def test_get_all_deliveries(self):
        """Test getting all deliveries (admin)"""
        if not self.admin_token:
            self.log_test("Get All Deliveries", False, "No admin token available")
            return False

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        return self.run_test(
            "Get All Deliveries",
            "GET",
            "admin/deliveries",
            200,
            headers=headers
        )[0]

    def test_get_my_deliveries(self):
        """Test getting delivery person's deliveries"""
        if not self.delivery_person_token:
            self.log_test("Get My Deliveries", False, "No delivery person token available")
            return False

        headers = {'Authorization': f'Bearer {self.delivery_person_token}'}
        return self.run_test(
            "Get My Deliveries",
            "GET",
            "delivery-person/deliveries",
            200,
            headers=headers
        )[0]

    def test_delivery_stats(self):
        """Test getting delivery statistics"""
        if not self.delivery_person_token:
            self.log_test("Get Delivery Stats", False, "No delivery person token available")
            return False

        headers = {'Authorization': f'Bearer {self.delivery_person_token}'}
        return self.run_test(
            "Get Delivery Stats",
            "GET",
            "delivery-person/stats",
            200,
            headers=headers
        )[0]

    def test_update_delivery_status(self):
        """Test updating delivery status"""
        if not self.delivery_person_token or not self.created_delivery_id:
            self.log_test("Update Delivery Status", False, "No delivery person token or delivery ID available")
            return False

        headers = {'Authorization': f'Bearer {self.delivery_person_token}'}
        update_data = {
            "status": "delivered",
            "comments": "Delivered successfully to customer"
        }
        
        return self.run_test(
            "Update Delivery Status",
            "PUT",
            f"delivery-person/deliveries/{self.created_delivery_id}/status",
            200,
            data=update_data,
            headers=headers
        )[0]

    def test_reassign_delivery(self):
        """Test reassigning delivery (admin)"""
        if not self.admin_token or not self.created_delivery_id or not self.created_person_id:
            self.log_test("Reassign Delivery", False, "Missing required tokens or IDs")
            return False

        headers = {'Authorization': f'Bearer {self.admin_token}'}
        url = f"admin/deliveries/{self.created_delivery_id}/reassign?new_person_id={self.created_person_id}"
        
        return self.run_test(
            "Reassign Delivery",
            "PUT",
            url,
            200,
            headers=headers
        )[0]

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Milk Delivery API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)

        # Basic connectivity
        self.test_root_endpoint()
        
        # Admin initialization and login
        self.test_init_admin()
        self.test_admin_login()
        
        # Delivery person management
        self.test_delivery_person_creation()
        self.test_get_delivery_persons()
        
        # Delivery person authentication
        self.test_delivery_person_login()
        self.test_delivery_person_profile()
        
        # Delivery management
        self.test_create_delivery()
        self.test_get_all_deliveries()
        self.test_get_my_deliveries()
        self.test_delivery_stats()
        
        # Delivery operations
        self.test_update_delivery_status()
        self.test_reassign_delivery()

        print("=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed!")
            print("\nFailed tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
            return 1

def main():
    tester = MilkDeliveryAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())