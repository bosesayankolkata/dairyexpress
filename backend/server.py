from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret-for-dev')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app without a prefix
app = FastAPI(title="Milk Delivery API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Enums
class DeliveryStatus(str, Enum):
    PENDING = "pending"
    DELIVERED = "delivered"
    NOT_DELIVERED = "not_delivered"

class NotDeliveredReason(str, Enum):
    CUSTOMER_REFUSES = "Customer refuses delivery"
    DELIVERY_DELAY = "Delivery delay"
    BAD_WEATHER = "Bad Weather"
    CUSTOMER_NOT_REACHABLE = "Customer not reachable"
    DAMAGED_ITEM = "Damaged or defective item"
    INCOMPLETE_ADDRESS = "Incomplete or incorrect addresses"
    INCORRECT_ADDRESS = "Incorrect addresses"
    INCORRECT_ORDER = "Incorrect order"
    PAYMENT_PROBLEMS = "Problems with payment"
    UNREALISTIC_EXPECTATIONS = "Unrealistic expectations"

class OrderFrequency(str, Enum):
    ONCE = "once"
    ALTERNATE_DAY = "alternate_day"
    DAILY = "daily"
    CUSTOM = "custom"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"

# Models
class DeliveryPersonBase(BaseModel):
    name: str
    phone: str
    address: str
    aadhar_number: str
    bike_number: str
    age: int
    gender: str
    blood_group: str
    pincode: str
    time_of_work: str
    
class DeliveryPersonCreate(DeliveryPersonBase):
    password: str
    selected_pincodes: List[str] = []

class DeliveryPerson(DeliveryPersonBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    selected_pincodes: List[str] = []
    total_deliveries: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Product Management Models
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = ""
    is_active: bool = True

class Category(CategoryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProductTypeBase(BaseModel):
    name: str
    category_id: str
    description: Optional[str] = ""
    is_active: bool = True

class ProductType(ProductTypeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CharacteristicBase(BaseModel):
    name: str
    product_type_id: str
    description: Optional[str] = ""
    is_active: bool = True

class Characteristic(CharacteristicBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SizeBase(BaseModel):
    name: str
    value: str  # e.g., "250ml", "500ml", "1L"
    characteristic_id: str
    price: float
    is_active: bool = True

class Size(SizeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Customer Models
class CustomerBase(BaseModel):
    whatsapp_number: str
    name: str
    pincode: str
    address: str
    landmark: Optional[str] = ""

class Customer(CustomerBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    total_orders: int = 0

# Pin Code Management
class PinCodeBase(BaseModel):
    pincode: str
    area_name: str
    is_serviceable: bool = True

class PinCode(PinCodeBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    available_time_slots: List[str] = []  # e.g., ["6:00-8:00", "8:00-10:00"]
    delivery_charge: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Order Models  
class OrderItemBase(BaseModel):
    size_id: str
    quantity: int
    price_per_unit: float
    
class OrderItem(OrderItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))

class OrderBase(BaseModel):
    customer_id: str
    items: List[OrderItem]
    delivery_date: str
    delivery_time_slot: str
    frequency: OrderFrequency
    subscription_days: Optional[int] = 1
    total_amount: float
    payment_status: PaymentStatus = PaymentStatus.PENDING
    
class Order(OrderBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    delivery_person_id: Optional[str] = None
    delivery_status: DeliveryStatus = DeliveryStatus.PENDING
    payment_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Feedback Models
class FeedbackBase(BaseModel):
    order_id: str
    customer_id: str
    product_rating: int = Field(ge=1, le=5)
    product_message: Optional[str] = ""
    delivery_rating: int = Field(ge=1, le=5) 
    delivery_message: Optional[str] = ""

class Feedback(FeedbackBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    delivery_person_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DeliveryBase(BaseModel):
    customer_name: str
    customer_address: str
    customer_phone: str
    customer_whatsapp: str
    customer_pincode: str
    product_name: str
    product_quantity: str
    delivery_date: str  # YYYY-MM-DD format

class DeliveryCreate(DeliveryBase):
    delivery_person_id: str

class DeliveryUpdate(BaseModel):
    status: DeliveryStatus
    reason: Optional[NotDeliveredReason] = None
    comments: Optional[str] = None

class Delivery(DeliveryBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    delivery_person_id: str
    status: DeliveryStatus = DeliveryStatus.PENDING
    reason: Optional[NotDeliveredReason] = None
    comments: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AdminBase(BaseModel):
    username: str

class AdminCreate(AdminBase):
    password: str

class Admin(AdminBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_type: str
    user_data: dict

class DeliveryStatsResponse(BaseModel):
    total_deliveries: int
    completed_deliveries: int
    pending_deliveries: int
    daily_stats: dict

# Helper functions
def hash_password(password: str) -> str:
    salt = os.environ.get('PASSWORD_SALT', 'fallback-salt-for-dev')
    return hashlib.sha256((password + salt).encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def prepare_for_mongo(data):
    """Convert datetime objects to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = prepare_for_mongo(value)
            else:
                result[key] = value
        return result
    return data

def parse_from_mongo(item):
    """Convert ISO strings back to datetime objects from MongoDB"""
    if isinstance(item, dict):
        result = {}
        for key, value in item.items():
            if key in ['created_at', 'updated_at'] and isinstance(value, str):
                try:
                    result[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    result[key] = value
            else:
                result[key] = value
        return result
    return item

# Authentication dependency
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("user_type")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return {"user_id": user_id, "user_type": user_type}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# Routes
@api_router.get("/")
async def root():
    return {"message": "Milk Delivery API"}

# Authentication routes
@api_router.post("/login", response_model=LoginResponse)
async def login(login_request: LoginRequest):
    # Check if it's admin login
    admin = await db.admins.find_one({"username": login_request.username})
    if admin and verify_password(login_request.password, admin["password_hash"]):
        access_token = create_access_token(
            data={"sub": admin["id"], "user_type": "admin"}
        )
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user_type="admin",
            user_data={"id": admin["id"], "username": admin["username"]}
        )
    
    # Check if it's delivery person login (phone as username)
    delivery_person = await db.delivery_persons.find_one({"phone": login_request.username})
    if delivery_person and verify_password(login_request.password, delivery_person["password_hash"]):
        access_token = create_access_token(
            data={"sub": delivery_person["id"], "user_type": "delivery_person"}
        )
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user_type="delivery_person",
            user_data={
                "id": delivery_person["id"],
                "name": delivery_person["name"],
                "phone": delivery_person["phone"],
                "pincode": delivery_person["pincode"]
            }
        )
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

# Admin routes
# Legacy delivery person creation (for backward compatibility)
class LegacyDeliveryPersonCreate(BaseModel):
    name: str
    phone: str
    pincode: str
    password: str

@api_router.post("/admin/delivery-persons", response_model=DeliveryPerson)
async def create_delivery_person(person: DeliveryPersonCreate, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if phone already exists
    existing = await db.delivery_persons.find_one({"phone": person.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    person_dict = person.dict()
    password_hash = hash_password(person_dict.pop("password"))
    selected_pincodes = person_dict.pop("selected_pincodes", [])
    
    person_obj = DeliveryPerson(**person_dict, selected_pincodes=selected_pincodes)
    person_data = prepare_for_mongo(person_obj.dict())
    person_data["password_hash"] = password_hash
    
    await db.delivery_persons.insert_one(person_data)
    return person_obj

# Legacy endpoint for simple delivery person creation (backward compatibility)
@api_router.post("/admin/delivery-persons/simple")
async def create_simple_delivery_person(person: LegacyDeliveryPersonCreate, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if phone already exists
    existing = await db.delivery_persons.find_one({"phone": person.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create with default values for new fields
    enhanced_person = DeliveryPersonCreate(
        name=person.name,
        phone=person.phone,
        pincode=person.pincode,
        password=person.password,
        address="Not provided",
        aadhar_number="Not provided", 
        bike_number="Not provided",
        age=25,
        gender="Not specified",
        blood_group="Not specified",
        time_of_work="Not specified",
        selected_pincodes=[person.pincode]
    )
    
    person_dict = enhanced_person.dict()
    password_hash = hash_password(person_dict.pop("password"))
    selected_pincodes = person_dict.pop("selected_pincodes")
    
    person_obj = DeliveryPerson(**person_dict, selected_pincodes=selected_pincodes)
    person_data = prepare_for_mongo(person_obj.dict())
    person_data["password_hash"] = password_hash
    
    await db.delivery_persons.insert_one(person_data)
    return person_obj

@api_router.get("/admin/delivery-persons", response_model=List[DeliveryPerson])
async def get_delivery_persons(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    persons = await db.delivery_persons.find({}, {"password_hash": 0}).to_list(1000)
    
    # Handle legacy delivery persons with missing fields
    result = []
    for person in persons:
        person_data = parse_from_mongo(person)
        
        # Add default values for missing fields (backward compatibility)
        if 'address' not in person_data:
            person_data['address'] = "Not provided"
        if 'aadhar_number' not in person_data:
            person_data['aadhar_number'] = "Not provided"
        if 'bike_number' not in person_data:
            person_data['bike_number'] = "Not provided"
        if 'age' not in person_data:
            person_data['age'] = 25
        if 'gender' not in person_data:
            person_data['gender'] = "Not specified"
        if 'blood_group' not in person_data:
            person_data['blood_group'] = "Not specified"
        if 'time_of_work' not in person_data:
            person_data['time_of_work'] = "Not specified"
        if 'selected_pincodes' not in person_data:
            person_data['selected_pincodes'] = [person_data.get('pincode', '')]
        if 'total_deliveries' not in person_data:
            person_data['total_deliveries'] = 0
            
        result.append(DeliveryPerson(**person_data))
    
    return result

@api_router.put("/admin/delivery-persons/{person_id}/reset-password")
async def reset_delivery_person_password(person_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Generate new password
    import random
    import string
    new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
    password_hash = hash_password(new_password)
    
    # Update in database
    result = await db.delivery_persons.update_one(
        {"id": person_id},
        {"$set": {"password_hash": password_hash}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Delivery person not found")
    
    return {"message": "Password reset successfully", "new_password": new_password}

@api_router.post("/admin/deliveries", response_model=Delivery)
async def create_delivery(delivery: DeliveryCreate, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify delivery person exists
    person = await db.delivery_persons.find_one({"id": delivery.delivery_person_id})
    if not person:
        raise HTTPException(status_code=404, detail="Delivery person not found")
    
    delivery_obj = Delivery(**delivery.dict())
    delivery_data = prepare_for_mongo(delivery_obj.dict())
    
    await db.deliveries.insert_one(delivery_data)
    return delivery_obj

@api_router.put("/admin/deliveries/{delivery_id}/reassign")
async def reassign_delivery(delivery_id: str, new_person_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify new delivery person exists
    person = await db.delivery_persons.find_one({"id": new_person_id})
    if not person:
        raise HTTPException(status_code=404, detail="Delivery person not found")
    
    result = await db.deliveries.update_one(
        {"id": delivery_id},
        {"$set": {"delivery_person_id": new_person_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    return {"message": "Delivery reassigned successfully"}

@api_router.get("/admin/deliveries")
async def get_all_deliveries(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    deliveries = await db.deliveries.find().to_list(1000)
    return [Delivery(**parse_from_mongo(delivery)) for delivery in deliveries]

# Product Management Routes
@api_router.post("/admin/categories", response_model=Category)
async def create_category(category: CategoryBase, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    category_obj = Category(**category.dict())
    category_data = prepare_for_mongo(category_obj.dict())
    await db.categories.insert_one(category_data)
    return category_obj

@api_router.get("/admin/categories", response_model=List[Category])
async def get_categories(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    categories = await db.categories.find().to_list(1000)
    return [Category(**parse_from_mongo(cat)) for cat in categories]

@api_router.put("/admin/categories/{category_id}")
async def update_category(category_id: str, category_update: CategoryBase, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = prepare_for_mongo(category_update.dict())
    result = await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    return {"message": "Category updated successfully"}

@api_router.post("/admin/product-types", response_model=ProductType)
async def create_product_type(product_type: ProductTypeBase, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify category exists
    category = await db.categories.find_one({"id": product_type.category_id})
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    product_type_obj = ProductType(**product_type.dict())
    product_type_data = prepare_for_mongo(product_type_obj.dict())
    await db.product_types.insert_one(product_type_data)
    return product_type_obj

@api_router.get("/admin/product-types", response_model=List[ProductType])
async def get_product_types(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    product_types = await db.product_types.find().to_list(1000)
    return [ProductType(**parse_from_mongo(pt)) for pt in product_types]

@api_router.post("/admin/characteristics", response_model=Characteristic)
async def create_characteristic(characteristic: CharacteristicBase, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify product type exists
    product_type = await db.product_types.find_one({"id": characteristic.product_type_id})
    if not product_type:
        raise HTTPException(status_code=404, detail="Product type not found")
    
    characteristic_obj = Characteristic(**characteristic.dict())
    characteristic_data = prepare_for_mongo(characteristic_obj.dict())
    await db.characteristics.insert_one(characteristic_data)
    return characteristic_obj

@api_router.get("/admin/characteristics", response_model=List[Characteristic])
async def get_characteristics(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    characteristics = await db.characteristics.find().to_list(1000)
    return [Characteristic(**parse_from_mongo(char)) for char in characteristics]

@api_router.post("/admin/sizes", response_model=Size)
async def create_size(size: SizeBase, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify characteristic exists
    characteristic = await db.characteristics.find_one({"id": size.characteristic_id})
    if not characteristic:
        raise HTTPException(status_code=404, detail="Characteristic not found")
    
    size_obj = Size(**size.dict())
    size_data = prepare_for_mongo(size_obj.dict())
    await db.sizes.insert_one(size_data)
    return size_obj

@api_router.get("/admin/sizes", response_model=List[Size])
async def get_sizes(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    sizes = await db.sizes.find().to_list(1000)
    return [Size(**parse_from_mongo(size)) for size in sizes]

# Pin Code Management Routes
@api_router.post("/admin/pincodes", response_model=PinCode)
async def create_pincode(pincode: PinCodeBase, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if pincode already exists
    existing = await db.pincodes.find_one({"pincode": pincode.pincode})
    if existing:
        raise HTTPException(status_code=400, detail="Pin code already exists")
    
    pincode_obj = PinCode(**pincode.dict())
    pincode_data = prepare_for_mongo(pincode_obj.dict())
    await db.pincodes.insert_one(pincode_data)
    return pincode_obj

@api_router.get("/admin/pincodes", response_model=List[PinCode])
async def get_pincodes(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    pincodes = await db.pincodes.find().to_list(1000)
    return [PinCode(**parse_from_mongo(pc)) for pc in pincodes]

@api_router.put("/admin/pincodes/{pincode_id}")
async def update_pincode(pincode_id: str, pincode_update: PinCodeBase, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = prepare_for_mongo(pincode_update.dict())
    result = await db.pincodes.update_one({"id": pincode_id}, {"$set": update_data})
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pin code not found")
    
    return {"message": "Pin code updated successfully"}

# Customer Management Routes
@api_router.get("/admin/customers", response_model=List[Customer])
async def get_customers(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    customers = await db.customers.find().to_list(1000)
    return [Customer(**parse_from_mongo(customer)) for customer in customers]

@api_router.get("/admin/orders", response_model=List[Order])
async def get_orders(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    orders = await db.orders.find().to_list(1000)
    return [Order(**parse_from_mongo(order)) for order in orders]

# Search functionality
@api_router.get("/admin/search")
async def search_data(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    product_id: Optional[str] = None,
    pincode: Optional[str] = None,
    delivery_person_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build search query
    query = {}
    if start_date and end_date:
        query["created_at"] = {"$gte": start_date, "$lte": end_date}
    if delivery_person_id:
        query["delivery_person_id"] = delivery_person_id
    
    # Search in orders and deliveries
    orders = await db.orders.find(query).to_list(1000)
    deliveries = await db.deliveries.find(query).to_list(1000)
    
    return {
        "orders": [Order(**parse_from_mongo(order)) for order in orders],
        "deliveries": [Delivery(**parse_from_mongo(delivery)) for delivery in deliveries]
    }

# Delivery person routes
@api_router.get("/delivery-person/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "delivery_person":
        raise HTTPException(status_code=403, detail="Delivery person access required")
    
    person = await db.delivery_persons.find_one({"id": current_user["user_id"]}, {"password_hash": 0})
    if not person:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return DeliveryPerson(**parse_from_mongo(person))

@api_router.get("/delivery-person/deliveries")
async def get_my_deliveries(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "delivery_person":
        raise HTTPException(status_code=403, detail="Delivery person access required")
    
    deliveries = await db.deliveries.find({"delivery_person_id": current_user["user_id"]}).to_list(1000)
    return [Delivery(**parse_from_mongo(delivery)) for delivery in deliveries]

@api_router.put("/delivery-person/deliveries/{delivery_id}/status")
async def update_delivery_status(delivery_id: str, update: DeliveryUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "delivery_person":
        raise HTTPException(status_code=403, detail="Delivery person access required")
    
    # Verify delivery belongs to current user
    delivery = await db.deliveries.find_one({"id": delivery_id, "delivery_person_id": current_user["user_id"]})
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery not found")
    
    update_data = {
        "status": update.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if update.reason:
        update_data["reason"] = update.reason
    if update.comments:
        update_data["comments"] = update.comments
    
    await db.deliveries.update_one(
        {"id": delivery_id},
        {"$set": update_data}
    )
    
    return {"message": "Delivery status updated successfully"}

@api_router.get("/delivery-person/stats", response_model=DeliveryStatsResponse)
async def get_delivery_stats(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "delivery_person":
        raise HTTPException(status_code=403, detail="Delivery person access required")
    
    deliveries = await db.deliveries.find({"delivery_person_id": current_user["user_id"]}).to_list(1000)
    
    total_deliveries = len(deliveries)
    completed_deliveries = len([d for d in deliveries if d["status"] in ["delivered", "not_delivered"]])
    pending_deliveries = total_deliveries - completed_deliveries
    
    # Group by date
    daily_stats = {}
    for delivery in deliveries:
        date = delivery["delivery_date"]
        if date not in daily_stats:
            daily_stats[date] = {"total": 0, "completed": 0, "pending": 0}
        daily_stats[date]["total"] += 1
        if delivery["status"] in ["delivered", "not_delivered"]:
            daily_stats[date]["completed"] += 1
        else:
            daily_stats[date]["pending"] += 1
    
    return DeliveryStatsResponse(
        total_deliveries=total_deliveries,
        completed_deliveries=completed_deliveries,
        pending_deliveries=pending_deliveries,
        daily_stats=daily_stats
    )

# WhatsApp Integration with whapi.cloud
import httpx
from typing import Dict, Any

# WhatsApp Configuration
WHAPI_API_URL = "https://gate.whapi.cloud"
WHAPI_TOKEN = "4NtJEaPI6sZSAzNKJlLKkZ3fAANcTNeJ"
WHATSAPP_PHONE = "+91 90075 09919"

# WhatsApp Models
class WhatsAppMessage(BaseModel):
    chat_id: str
    text: str
    
class IncomingWhatsAppMessage(BaseModel):
    messages: List[Dict[str, Any]]

class WhatsAppCustomer(BaseModel):
    whatsapp_number: str
    name: Optional[str] = ""
    current_step: str = "welcome"
    conversation_data: Dict[str, Any] = {}
    orders: List[str] = []

# WhatsApp helper functions
async def send_whatsapp_message(phone_number: str, message: str):
    """Send WhatsApp message via whapi.cloud"""
    try:
        headers = {
            "Authorization": f"Bearer {WHAPI_TOKEN}",
            "Content-Type": "application/json"
        }
        
        # Remove country code formatting if present
        clean_phone = phone_number.replace("+", "").replace("-", "").replace(" ", "")
        
        payload = {
            "typing_time": 0,
            "to": f"{clean_phone}@s.whatsapp.net",
            "body": message
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WHAPI_API_URL}/messages/text",
                headers=headers,
                json=payload,
                timeout=30
            )
            
        return response.json() if response.status_code == 200 else None
        
    except Exception as e:
        print(f"WhatsApp send error: {e}")
        return None

async def get_or_create_whatsapp_customer(db, phone_number: str) -> WhatsAppCustomer:
    """Get existing WhatsApp customer or create new one"""
    customer = await db.whatsapp_customers.find_one({"whatsapp_number": phone_number})
    
    if not customer:
        customer_data = WhatsAppCustomer(
            whatsapp_number=phone_number,
            current_step="welcome",
            conversation_data={}
        ).dict()
        
        await db.whatsapp_customers.insert_one(customer_data)
        return WhatsAppCustomer(**customer_data)
    
    return WhatsAppCustomer(**parse_from_mongo(customer))

async def update_whatsapp_customer(db, phone_number: str, data: dict):
    """Update WhatsApp customer data"""
    await db.whatsapp_customers.update_one(
        {"whatsapp_number": phone_number},
        {"$set": data}
    )

async def process_whatsapp_message(db, phone_number: str, message: str) -> str:
    """Process incoming WhatsApp message and generate response"""
    
    customer = await get_or_create_whatsapp_customer(db, phone_number)
    current_step = customer.current_step
    message_lower = message.lower().strip()
    
    # Handle "Go Back" option in any step
    if message_lower in ["back", "go back", "previous", "←"]:
        return await handle_go_back(db, phone_number, customer)
    
    # Handle self-service options
    if message_lower in ["pause", "skip tomorrow", "change qty", "cancel subscription"]:
        return await handle_self_service(db, phone_number, message_lower, customer)
    
    # Welcome message
    if current_step == "welcome" or message_lower in ["hi", "hello", "hey", "start"]:
        await update_whatsapp_customer(db, phone_number, {"current_step": "customer_type"})
        return """🥛 *Welcome to Fresh Dairy!* 🥛

Are you a:
1️⃣ *New Customer*
2️⃣ *Existing Customer*

Please reply with *1* for New Customer or *2* for Existing Customer.

_Type "Back" anytime to go to the previous step_"""

    # Customer type selection
    elif current_step == "customer_type":
        if message_lower in ["1", "new", "new customer"]:
            await update_whatsapp_customer(db, phone_number, {"current_step": "capture_location"})
            return await capture_location_request()
        elif message_lower in ["2", "existing", "existing customer"]:
            await update_whatsapp_customer(db, phone_number, {"current_step": "existing_menu"})
            return await show_existing_customer_menu(db, customer)
        else:
            return """Please reply with *1* for New Customer or *2* for Existing Customer.

📱 Type *Back* to return to welcome message"""
    
    # Existing customer menu
    elif current_step == "existing_menu":
        return await handle_existing_customer_menu(db, phone_number, message, customer)
    
    # Capture location
    elif current_step == "capture_location":
        return await handle_location_capture(db, phone_number, message, customer)
    
    # Show categories via Interactive List
    elif current_step == "show_categories":
        return await handle_category_selection_interactive(db, phone_number, message, customer)
    
    # Show products via Multi-Product Message
    elif current_step == "show_products":
        return await handle_product_selection_catalog(db, phone_number, message, customer)
    
    # Handle product types
    elif current_step == "show_product_types":
        return await handle_product_type_selection(db, phone_number, message, customer)
    
    # Handle characteristics
    elif current_step == "show_characteristics":
        return await handle_characteristic_selection(db, phone_number, message, customer)
    
    # Handle sizes
    elif current_step == "show_sizes":
        return await handle_size_selection(db, phone_number, message, customer)
    
    # Handle quantity and frequency
    elif current_step == "select_quantity_frequency":
        return await handle_quantity_frequency_selection(db, phone_number, message, customer)
    
    # Handle delivery slot
    elif current_step == "select_delivery_slot":
        return await handle_delivery_slot_selection(db, phone_number, message, customer)
    
    # Handle address
    elif current_step == "collect_address":
        return await handle_address_collection(db, phone_number, message, customer)
    
    # Handle name collection
    elif current_step == "collect_name":
        return await handle_name_collection(db, phone_number, message, customer)
    
    # Handle order confirmation
    elif current_step == "confirm_order":
        return await handle_order_confirmation(db, phone_number, message, customer)
    
    # Self-service menu
    elif current_step == "self_service_menu":
        return await handle_self_service_menu(db, phone_number, message, customer)
    
    # Default fallback
    else:
        await update_whatsapp_customer(db, phone_number, {"current_step": "welcome"})
        return """I didn't understand that. Let me help you start over.

Type *Hi* to begin ordering! 🥛"""

async def show_product_categories(db):
    """Show available product categories"""
    categories = await db.categories.find({"is_active": True}).to_list(100)
    
    if not categories:
        return "Sorry, no products are currently available. Please contact support."
    
    message = "🛒 *Please select a product category:*\n\n"
    for i, category in enumerate(categories, 1):
        message += f"{i}️⃣ *{category['name']}*\n"
        if category.get('description'):
            message += f"   _{category['description']}_\n"
        message += "\n"
    
    message += "Please reply with the number of your choice."
    return message

async def handle_category_selection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle category selection"""
    try:
        categories = await db.categories.find({"is_active": True}).to_list(100)
        selected_index = int(message) - 1
        
        if 0 <= selected_index < len(categories):
            selected_category = categories[selected_index]
            
            # Update customer data
            conversation_data = customer.conversation_data
            conversation_data["selected_category_id"] = selected_category["id"]
            conversation_data["selected_category_name"] = selected_category["name"]
            
            await update_whatsapp_customer(db, phone_number, {
                "current_step": "show_product_types",
                "conversation_data": conversation_data
            })
            
            return await show_product_types(db, selected_category["id"])
        else:
            return f"Please select a valid option (1-{len(categories)})."
            
    except ValueError:
        return "Please reply with a number to select a category."

async def show_product_types(db, category_id: str):
    """Show product types for selected category"""
    product_types = await db.product_types.find({
        "category_id": category_id,
        "is_active": True
    }).to_list(100)
    
    if not product_types:
        return "No product types available for this category."
    
    message = "📝 *Please select a product type:*\n\n"
    for i, ptype in enumerate(product_types, 1):
        message += f"{i}️⃣ *{ptype['name']}*\n"
        if ptype.get('description'):
            message += f"   _{ptype['description']}_\n"
        message += "\n"
    
    message += "Please reply with the number of your choice."
    return message

async def handle_product_type_selection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle product type selection"""
    try:
        category_id = customer.conversation_data.get("selected_category_id")
        product_types = await db.product_types.find({
            "category_id": category_id,
            "is_active": True
        }).to_list(100)
        
        selected_index = int(message) - 1
        
        if 0 <= selected_index < len(product_types):
            selected_type = product_types[selected_index]
            
            conversation_data = customer.conversation_data
            conversation_data["selected_product_type_id"] = selected_type["id"]
            conversation_data["selected_product_type_name"] = selected_type["name"]
            
            await update_whatsapp_customer(db, phone_number, {
                "current_step": "show_characteristics", 
                "conversation_data": conversation_data
            })
            
            return await show_characteristics(db, selected_type["id"])
        else:
            return f"Please select a valid option (1-{len(product_types)})."
            
    except ValueError:
        return "Please reply with a number to select a product type."

async def show_characteristics(db, product_type_id: str):
    """Show characteristics for selected product type"""
    characteristics = await db.characteristics.find({
        "product_type_id": product_type_id,
        "is_active": True
    }).to_list(100)
    
    if not characteristics:
        return "No characteristics available for this product type."
    
    message = "✨ *Please select product characteristics:*\n\n"
    for i, char in enumerate(characteristics, 1):
        message += f"{i}️⃣ *{char['name']}*\n"
        if char.get('description'):
            message += f"   _{char['description']}_\n"
        message += "\n"
    
    message += "Please reply with the number of your choice."
    return message

async def handle_characteristic_selection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle characteristic selection"""
    try:
        product_type_id = customer.conversation_data.get("selected_product_type_id")
        characteristics = await db.characteristics.find({
            "product_type_id": product_type_id,
            "is_active": True
        }).to_list(100)
        
        selected_index = int(message) - 1
        
        if 0 <= selected_index < len(characteristics):
            selected_char = characteristics[selected_index]
            
            conversation_data = customer.conversation_data
            conversation_data["selected_characteristic_id"] = selected_char["id"]
            conversation_data["selected_characteristic_name"] = selected_char["name"]
            
            await update_whatsapp_customer(db, phone_number, {
                "current_step": "show_sizes",
                "conversation_data": conversation_data
            })
            
            return await show_sizes(db, selected_char["id"])
        else:
            return f"Please select a valid option (1-{len(characteristics)})."
            
    except ValueError:
        return "Please reply with a number to select characteristics."

async def show_sizes(db, characteristic_id: str):
    """Show sizes and prices for selected characteristic"""
    sizes = await db.sizes.find({
        "characteristic_id": characteristic_id,
        "is_active": True
    }).to_list(100)
    
    if not sizes:
        return "No sizes available for this product."
    
    message = "📏 *Please select a size:*\n\n"
    for i, size in enumerate(sizes, 1):
        message += f"{i}️⃣ *{size['name']} ({size['value']})*\n"
        message += f"   💰 ₹{size['price']:.2f}\n\n"
    
    message += "Please reply with the number of your choice."
    return message

async def handle_size_selection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle size selection"""
    try:
        characteristic_id = customer.conversation_data.get("selected_characteristic_id")
        sizes = await db.sizes.find({
            "characteristic_id": characteristic_id,
            "is_active": True
        }).to_list(100)
        
        selected_index = int(message) - 1
        
        if 0 <= selected_index < len(sizes):
            selected_size = sizes[selected_index]
            
            conversation_data = customer.conversation_data
            conversation_data["selected_size_id"] = selected_size["id"]
            conversation_data["selected_size_name"] = selected_size["name"]
            conversation_data["selected_size_value"] = selected_size["value"]
            conversation_data["selected_size_price"] = selected_size["price"]
            
            await update_whatsapp_customer(db, phone_number, {
                "current_step": "select_quantity",
                "conversation_data": conversation_data
            })
            
            return f"""📦 *Selected: {selected_size['name']} ({selected_size['value']})*
💰 Price: ₹{selected_size['price']:.2f}

🔢 *How many units do you want?*

Please enter the quantity (e.g., 1, 2, 3, etc.)"""
        else:
            return f"Please select a valid option (1-{len(sizes)})."
            
    except ValueError:
        return "Please reply with a number to select a size."

async def handle_quantity_selection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle quantity selection"""
    try:
        quantity = int(message)
        
        if quantity <= 0:
            return "Please enter a valid quantity (1 or more)."
        
        conversation_data = customer.conversation_data
        conversation_data["selected_quantity"] = quantity
        
        # Calculate total
        price = conversation_data.get("selected_size_price", 0)
        total = price * quantity
        conversation_data["total_amount"] = total
        
        await update_whatsapp_customer(db, phone_number, {
            "current_step": "check_pincode",
            "conversation_data": conversation_data
        })
        
        return f"""✅ *Order Summary:*
📦 {conversation_data.get('selected_category_name')} - {conversation_data.get('selected_product_type_name')}
🏷️ {conversation_data.get('selected_characteristic_name')}
📏 {conversation_data.get('selected_size_name')} ({conversation_data.get('selected_size_value')})
🔢 Quantity: {quantity}
💰 Total: ₹{total:.2f}

📍 *Please enter your PIN CODE for delivery availability check:*"""
        
    except ValueError:
        return "Please enter a valid number for quantity."

async def handle_pincode_check(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle pincode validation"""
    pincode = message.strip()
    
    # Check if pincode is serviceable
    pincode_data = await db.pincodes.find_one({
        "pincode": pincode,
        "is_serviceable": True
    })
    
    if not pincode_data:
        await update_whatsapp_customer(db, phone_number, {"current_step": "welcome"})
        return f"""❌ *Sorry, we don't deliver to {pincode} yet.*

We're working to expand our delivery areas. Please try again in the future!

Type *Hi* to start a new order for a different location."""
    
    conversation_data = customer.conversation_data
    conversation_data["delivery_pincode"] = pincode
    conversation_data["delivery_area"] = pincode_data.get("area_name", "")
    
    # Show available time slots
    time_slots = pincode_data.get("available_time_slots", [])
    time_slots_text = "\n".join([f"⏰ {slot}" for slot in time_slots]) if time_slots else "⏰ Standard delivery hours"
    
    await update_whatsapp_customer(db, phone_number, {
        "current_step": "collect_address",
        "conversation_data": conversation_data
    })
    
    return f"""✅ *Great! We deliver to {pincode}*
📍 Area: {pincode_data.get('area_name', pincode)}

🕐 *Available Time Slots:*
{time_slots_text}

📝 *Please provide your complete delivery address:*
(Include house/flat number, street, landmark)"""

async def handle_address_collection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle address collection"""
    address = message.strip()
    
    if len(address) < 10:
        return "Please provide a more detailed address including house number, street, and landmark."
    
    conversation_data = customer.conversation_data
    conversation_data["delivery_address"] = address
    
    await update_whatsapp_customer(db, phone_number, {
        "current_step": "collect_name",
        "conversation_data": conversation_data
    })
    
    return "👤 *What's your name?*\n\nPlease provide your full name for the delivery."

async def handle_name_collection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle customer name collection"""
    name = message.strip()
    
    if len(name) < 2:
        return "Please provide your full name."
    
    conversation_data = customer.conversation_data
    conversation_data["customer_name"] = name
    
    await update_whatsapp_customer(db, phone_number, {
        "current_step": "select_frequency",
        "conversation_data": conversation_data
    })
    
    return await show_frequency_options()

async def show_frequency_options():
    """Show delivery frequency options"""
    return """🔄 *How frequently do you need this product?*

1️⃣ *Once* - One time delivery
2️⃣ *Every alternate day* (30 days subscription)
3️⃣ *Every day* (30 days subscription)  
4️⃣ *Custom* (Select specific dates for 30 days)

Please reply with the number of your choice."""

async def handle_frequency_selection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle delivery frequency selection"""
    frequency_map = {
        "1": {"type": "once", "name": "One time delivery", "days": 1},
        "2": {"type": "alternate_day", "name": "Every alternate day", "days": 30}, 
        "3": {"type": "daily", "name": "Every day", "days": 30},
        "4": {"type": "custom", "name": "Custom schedule", "days": 30}
    }
    
    if message.strip() in frequency_map:
        frequency = frequency_map[message.strip()]
        
        conversation_data = customer.conversation_data
        conversation_data["delivery_frequency"] = frequency
        
        # Calculate final amount based on frequency
        base_amount = conversation_data.get("total_amount", 0)
        if frequency["type"] == "alternate_day":
            total_amount = base_amount * 15  # 15 deliveries in 30 days
        elif frequency["type"] == "daily":
            total_amount = base_amount * 30  # 30 deliveries
        elif frequency["type"] == "custom":
            total_amount = base_amount * 20  # Estimate 20 deliveries
        else:
            total_amount = base_amount
            
        conversation_data["final_total"] = total_amount
        
        await update_whatsapp_customer(db, phone_number, {
            "current_step": "confirm_order",
            "conversation_data": conversation_data
        })
        
        return await show_order_confirmation(conversation_data)
    else:
        return "Please select a valid option (1, 2, 3, or 4)."

async def show_order_confirmation(conversation_data: dict):
    """Show final order confirmation"""
    frequency = conversation_data.get("delivery_frequency", {})
    
    return f"""📋 *ORDER CONFIRMATION*

👤 Name: {conversation_data.get('customer_name')}
📦 Product: {conversation_data.get('selected_category_name')} - {conversation_data.get('selected_product_type_name')}
🏷️ Type: {conversation_data.get('selected_characteristic_name')}
📏 Size: {conversation_data.get('selected_size_name')} ({conversation_data.get('selected_size_value')})
🔢 Quantity: {conversation_data.get('selected_quantity')}
📍 Address: {conversation_data.get('delivery_address')}
📮 PIN: {conversation_data.get('delivery_pincode')}
🔄 Frequency: {frequency.get('name')}
💰 *Total Amount: ₹{conversation_data.get('final_total', 0):.2f}*

Reply *CONFIRM* to proceed to payment or *CANCEL* to start over."""

async def handle_order_confirmation(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle order confirmation"""
    message_lower = message.lower().strip()
    
    if message_lower == "confirm":
        # Create order in database
        conversation_data = customer.conversation_data
        
        # Create customer if not exists
        customer_data = {
            "whatsapp_number": phone_number,
            "name": conversation_data.get("customer_name", ""),
            "pincode": conversation_data.get("delivery_pincode", ""),
            "address": conversation_data.get("delivery_address", ""),
            "landmark": ""
        }
        
        # Check if customer already exists
        existing_customer = await db.customers.find_one({"whatsapp_number": phone_number})
        if not existing_customer:
            customer_obj = Customer(**customer_data)
            customer_mongo_data = prepare_for_mongo(customer_obj.dict())
            await db.customers.insert_one(customer_mongo_data)
            customer_id = customer_obj.id
        else:
            customer_id = existing_customer["id"]
        
        # Create order
        order_data = {
            "customer_id": customer_id,
            "items": [{
                "size_id": conversation_data.get("selected_size_id"),
                "quantity": conversation_data.get("selected_quantity", 1),
                "price_per_unit": conversation_data.get("selected_size_price", 0)
            }],
            "delivery_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "delivery_time_slot": "6:00-8:00",
            "frequency": OrderFrequency.ONCE,  # Will be updated based on selection
            "total_amount": conversation_data.get("final_total", 0),
            "payment_status": PaymentStatus.PENDING,
            "order_number": f"ORD{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
        }
        
        order_obj = Order(**order_data)
        order_mongo_data = prepare_for_mongo(order_obj.dict())
        await db.orders.insert_one(order_mongo_data)
        
        # Reset customer conversation
        await update_whatsapp_customer(db, phone_number, {
            "current_step": "welcome",
            "conversation_data": {}
        })
        
        return f"""✅ *ORDER CONFIRMED!*

📝 Order Number: {order_data['order_number']}
💰 Amount: ₹{conversation_data.get('final_total', 0):.2f}

💳 *Payment Link:* (Razorpay integration coming soon)

📞 For any queries, contact: +91 90075 09919

Thank you for choosing Fresh Dairy! 🥛"""
        
    elif message_lower == "cancel":
        await update_whatsapp_customer(db, phone_number, {
            "current_step": "welcome",
            "conversation_data": {}
        })
        
        return """❌ *Order cancelled.*

No worries! Type *Hi* whenever you want to place an order. 

We're here to serve you fresh dairy products! 🥛"""
        
    else:
        return "Please reply *CONFIRM* to confirm your order or *CANCEL* to cancel."

# New WhatsApp workflow functions

async def handle_go_back(db, phone_number: str, customer: WhatsAppCustomer):
    """Handle go back navigation"""
    current_step = customer.current_step
    
    # Define step hierarchy for back navigation
    step_hierarchy = {
        "customer_type": "welcome",
        "capture_location": "customer_type", 
        "show_categories": "capture_location",
        "show_products": "show_categories",
        "select_quantity_frequency": "show_products",
        "select_delivery_slot": "select_quantity_frequency",
        "collect_address": "select_delivery_slot",
        "collect_name": "collect_address",
        "confirm_order": "collect_name",
        "self_service_menu": "existing_menu"
    }
    
    previous_step = step_hierarchy.get(current_step, "welcome")
    await update_whatsapp_customer(db, phone_number, {"current_step": previous_step})
    
    # Return appropriate message for the previous step
    if previous_step == "welcome":
        return """🥛 *Welcome to Fresh Dairy!* 🥛

Are you a:
1️⃣ *New Customer*
2️⃣ *Existing Customer*

Please reply with *1* for New Customer or *2* for Existing Customer.

_Type "Back" anytime to go to the previous step_"""
    elif previous_step == "customer_type":
        return """🥛 *Welcome to Fresh Dairy!* 🥛

Are you a:
1️⃣ *New Customer*
2️⃣ *Existing Customer*

Please reply with *1* for New Customer or *2* for Existing Customer.

_Type "Back" anytime to go to the previous step_"""
    elif previous_step == "capture_location":
        return await capture_location_request()
    elif previous_step == "show_categories":
        return await show_categories_interactive_list(db)
    else:
        return "↩️ Going back to previous step..."

async def handle_self_service(db, phone_number: str, action: str, customer: WhatsAppCustomer):
    """Handle self-service options for existing customers"""
    if action == "pause":
        return """⏸️ *Pause Subscription*

Your subscription will be paused from tomorrow.
To resume, reply *RESUME* anytime.

📱 Type *Back* to return to menu"""
    
    elif action == "skip tomorrow":
        return """⏭️ *Skip Tomorrow's Delivery*

Tomorrow's delivery has been skipped.
Next delivery will be as per your regular schedule.

📱 Type *Back* to return to menu"""
    
    elif action == "change qty":
        return """🔢 *Change Quantity*

Current quantity: 2 bottles
Enter new quantity (1-10):

📱 Type *Back* to return to menu"""
    
    elif action == "cancel subscription":
        return """❌ *Cancel Subscription*

Are you sure you want to cancel your subscription?
Reply *YES* to confirm or *NO* to go back.

📱 Type *Back* to return to menu"""

async def capture_location_request():
    """Request location/pincode from new customer"""
    return """📍 *Location Required*

Please share your location or enter your PIN CODE for delivery availability check:

🗺️ Tap 📎 → Location to share your location
OR
📮 Type your 6-digit PIN CODE

_Type "Back" to go to previous step_"""

async def handle_location_capture(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle location/pincode capture"""
    # Check if it's a pincode (6 digits)
    if message.strip().isdigit() and len(message.strip()) == 6:
        pincode = message.strip()
        
        # Check if pincode is serviceable
        pincode_data = await db.pincodes.find_one({
            "pincode": pincode,
            "is_serviceable": True
        })
        
        if not pincode_data:
            return f"""❌ *Sorry, we don't deliver to {pincode} yet.*

We're working to expand our delivery areas. Please try again with a different PIN CODE.

📱 Type *Back* to go to previous step"""
        
        # Store pincode and move to categories
        conversation_data = customer.conversation_data
        conversation_data["delivery_pincode"] = pincode
        conversation_data["delivery_area"] = pincode_data.get("area_name", "")
        
        await update_whatsapp_customer(db, phone_number, {
            "current_step": "show_categories",
            "conversation_data": conversation_data
        })
        
        return f"""✅ *Great! We deliver to {pincode}*
📍 Area: {pincode_data.get('area_name', pincode)}

{await show_categories_interactive_list(db)}"""
    
    # Handle location sharing (GPS coordinates)
    elif "location" in message.lower() or "lat" in message.lower():
        # For now, ask for pincode as fallback
        return """📍 *Location received!*

For accurate delivery, please also provide your PIN CODE:

📮 Type your 6-digit PIN CODE

📱 Type *Back* to go to previous step"""
    
    else:
        return """❌ *Invalid input*

Please share your location or enter a valid 6-digit PIN CODE.

🗺️ Tap 📎 → Location to share your location
OR
📮 Type your 6-digit PIN CODE (e.g., 560001)

📱 Type *Back* to go to previous step"""

async def show_categories_interactive_list(db):
    """Show categories using Interactive List format"""
    categories = await db.categories.find({"is_active": True}).to_list(10)  # Max 10 for Interactive List
    
    if not categories:
        return "Sorry, no products are currently available. Please contact support."
    
    message = """🛒 *Select Product Category*

Choose from our fresh dairy products:

"""
    
    for i, category in enumerate(categories, 1):
        message += f"{i}️⃣ *{category['name']}*\n"
        if category.get('description'):
            message += f"   _{category['description']}_\n"
        message += "\n"
    
    message += """📱 Reply with the number of your choice
🔙 Type *Back* to go to previous step"""
    
    return message

async def handle_category_selection_interactive(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle category selection from Interactive List"""
    try:
        categories = await db.categories.find({"is_active": True}).to_list(10)
        selected_index = int(message) - 1
        
        if 0 <= selected_index < len(categories):
            selected_category = categories[selected_index]
            
            # Update customer data
            conversation_data = customer.conversation_data
            conversation_data["selected_category_id"] = selected_category["id"]
            conversation_data["selected_category_name"] = selected_category["name"]
            
            await update_whatsapp_customer(db, phone_number, {
                "current_step": "show_products",
                "conversation_data": conversation_data
            })
            
            return await show_products_catalog(db, selected_category["id"])
        else:
            return f"""❌ Please select a valid option (1-{len(categories)}).

📱 Type *Back* to go to previous step"""
            
    except ValueError:
        return """❌ Please reply with a number to select a category.

📱 Type *Back* to go to previous step"""

async def show_products_catalog(db, category_id: str):
    """Show products using Multi-Product Message format"""
    # Get all products for the category (simplified - combining type, characteristic, size)
    pipeline = [
        {"$match": {"category_id": category_id, "is_active": True}},
        {"$lookup": {
            "from": "characteristics",
            "localField": "id",
            "foreignField": "product_type_id",
            "as": "characteristics"
        }},
        {"$unwind": "$characteristics"},
        {"$lookup": {
            "from": "sizes", 
            "localField": "characteristics.id",
            "foreignField": "characteristic_id",
            "as": "sizes"
        }},
        {"$unwind": "$sizes"},
        {"$match": {"characteristics.is_active": True, "sizes.is_active": True}},
        {"$limit": 30}  # Max 30 for Multi-Product Message
    ]
    
    products = await db.product_types.aggregate(pipeline).to_list(30)
    
    if not products:
        return """❌ No products available in this category.

📱 Type *Back* to select a different category"""
    
    message = """🥛 *Available Products*

Select a product to add to cart:

"""
    
    for i, product in enumerate(products, 1):
        char_name = product['characteristics']['name']
        size_info = f"{product['sizes']['name']} ({product['sizes']['value']})"
        price = product['sizes']['price']
        
        message += f"{i}️⃣ *{product['name']} - {char_name}*\n"
        message += f"   📏 {size_info}\n"
        message += f"   💰 ₹{price:.2f}\n\n"
    
    message += """📱 Reply with the number to select a product
🔙 Type *Back* to select different category"""
    
    return message

async def handle_product_selection_catalog(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle product selection from catalog"""
    try:
        category_id = customer.conversation_data.get("selected_category_id")
        
        # Get products (same pipeline as show_products_catalog)
        pipeline = [
            {"$match": {"category_id": category_id, "is_active": True}},
            {"$lookup": {
                "from": "characteristics",
                "localField": "id", 
                "foreignField": "product_type_id",
                "as": "characteristics"
            }},
            {"$unwind": "$characteristics"},
            {"$lookup": {
                "from": "sizes",
                "localField": "characteristics.id",
                "foreignField": "characteristic_id", 
                "as": "sizes"
            }},
            {"$unwind": "$sizes"},
            {"$match": {"characteristics.is_active": True, "sizes.is_active": True}},
            {"$limit": 30}
        ]
        
        products = await db.product_types.aggregate(pipeline).to_list(30)
        selected_index = int(message) - 1
        
        if 0 <= selected_index < len(products):
            selected_product = products[selected_index]
            
            # Store product selection
            conversation_data = customer.conversation_data
            conversation_data["selected_product_type_id"] = selected_product["id"]
            conversation_data["selected_product_type_name"] = selected_product["name"]
            conversation_data["selected_characteristic_id"] = selected_product["characteristics"]["id"]
            conversation_data["selected_characteristic_name"] = selected_product["characteristics"]["name"]
            conversation_data["selected_size_id"] = selected_product["sizes"]["id"]
            conversation_data["selected_size_name"] = selected_product["sizes"]["name"]
            conversation_data["selected_size_value"] = selected_product["sizes"]["value"]
            conversation_data["selected_size_price"] = selected_product["sizes"]["price"]
            
            await update_whatsapp_customer(db, phone_number, {
                "current_step": "select_quantity_frequency",
                "conversation_data": conversation_data
            })
            
            return await show_quantity_frequency_options(selected_product)
        else:
            return f"""❌ Please select a valid option (1-{len(products)}).

📱 Type *Back* to go to previous step"""
            
    except ValueError:
        return """❌ Please reply with a number to select a product.

📱 Type *Back* to go to previous step"""

async def show_quantity_frequency_options(product):
    """Show quantity and frequency selection combined"""
    char_name = product['characteristics']['name']
    size_info = f"{product['sizes']['name']} ({product['sizes']['value']})"
    price = product['sizes']['price']
    
    return f"""📦 *Selected: {product['name']} - {char_name}*
📏 Size: {size_info}
💰 Price: ₹{price:.2f} per unit

🔢 *Quantity & Frequency*

1️⃣ *1 bottle - Once* (₹{price:.2f})
2️⃣ *1 bottle - Daily* (₹{price * 30:.2f}/month)
3️⃣ *2 bottles - Daily* (₹{price * 2 * 30:.2f}/month)
4️⃣ *1 bottle - Alternate days* (₹{price * 15:.2f}/month)
5️⃣ *Custom quantity & frequency*

📱 Reply with the number of your choice
🔙 Type *Back* to select different product"""

async def handle_quantity_frequency_selection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle combined quantity and frequency selection"""
    conversation_data = customer.conversation_data
    price = conversation_data.get("selected_size_price", 0)
    
    frequency_options = {
        "1": {"qty": 1, "freq": "once", "freq_name": "One time", "days": 1, "total": price},
        "2": {"qty": 1, "freq": "daily", "freq_name": "Daily", "days": 30, "total": price * 30},
        "3": {"qty": 2, "freq": "daily", "freq_name": "Daily", "days": 30, "total": price * 2 * 30},
        "4": {"qty": 1, "freq": "alternate_day", "freq_name": "Alternate days", "days": 30, "total": price * 15},
        "5": {"qty": 0, "freq": "custom", "freq_name": "Custom", "days": 0, "total": 0}
    }
    
    if message.strip() in frequency_options:
        selection = frequency_options[message.strip()]
        
        if selection["freq"] == "custom":
            return """🔧 *Custom Order*

Please specify:
1. Quantity per delivery (1-10)
2. Frequency (daily/alternate/weekly)

Example: "2 bottles daily" or "1 bottle weekly"

📱 Type *Back* to select from preset options"""
        
        # Store selection
        conversation_data["selected_quantity"] = selection["qty"]
        conversation_data["delivery_frequency"] = {
            "type": selection["freq"],
            "name": selection["freq_name"],
            "days": selection["days"]
        }
        conversation_data["total_amount"] = selection["total"]
        
        await update_whatsapp_customer(db, phone_number, {
            "current_step": "select_delivery_slot",
            "conversation_data": conversation_data
        })
        
        return await show_delivery_slots()
    else:
        return """❌ Please select a valid option (1-5).

📱 Type *Back* to go to previous step"""

async def show_delivery_slots():
    """Show available delivery time slots"""
    return """🕐 *Select Delivery Time*

When would you like your delivery?

1️⃣ *6:00 AM - 8:00 AM* (Early Morning)
2️⃣ *8:00 AM - 10:00 AM* (Morning)

📱 Reply with the number of your choice
🔙 Type *Back* to change quantity/frequency"""

async def handle_delivery_slot_selection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle delivery time slot selection"""
    slot_options = {
        "1": "6:00 AM - 8:00 AM",
        "2": "8:00 AM - 10:00 AM"
    }
    
    if message.strip() in slot_options:
        selected_slot = slot_options[message.strip()]
        
        conversation_data = customer.conversation_data
        conversation_data["delivery_time_slot"] = selected_slot
        
        await update_whatsapp_customer(db, phone_number, {
            "current_step": "collect_address",
            "conversation_data": conversation_data
        })
        
        return f"""✅ *Delivery Time: {selected_slot}*

📝 *Please provide your complete delivery address:*

Include:
• House/Flat number
• Street name  
• Landmark
• Area

Example: "A-101, Green Valley Apartments, Near City Mall, Koramangala"

📱 Type *Back* to change delivery time"""
    else:
        return """❌ Please select a valid time slot (1 or 2).

📱 Type *Back* to go to previous step"""

async def handle_self_service_menu(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle self-service menu options"""
    if message.strip() == "1":
        return await handle_self_service(db, phone_number, "pause", customer)
    elif message.strip() == "2":
        return await handle_self_service(db, phone_number, "skip tomorrow", customer)
    elif message.strip() == "3":
        return await handle_self_service(db, phone_number, "change qty", customer)
    elif message.strip() == "4":
        return await handle_self_service(db, phone_number, "cancel subscription", customer)
    else:
        return """❌ Please select a valid option (1-4).

📱 Type *Back* to go to main menu"""

async def capture_location_request():
    """Request location/pincode from new customer"""
    return """📍 *Location Required*

Please share your location or enter your PIN CODE for delivery availability check:

🗺️ Tap 📎 → Location to share your location
OR
📮 Type your 6-digit PIN CODE

_Type "Back" to go to previous step_"""

async def handle_location_capture(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle location/pincode capture"""
    # Check if it's a pincode (6 digits)
    if message.strip().isdigit() and len(message.strip()) == 6:
        pincode = message.strip()
        
        # Check if pincode is serviceable
        pincode_data = await db.pincodes.find_one({
            "pincode": pincode,
            "is_serviceable": True
        })
        
        if not pincode_data:
            return f"""❌ *Sorry, we don't deliver to {pincode} yet.*

We're working to expand our delivery areas. Please try again with a different PIN CODE.

📱 Type *Back* to go to previous step"""
        
        # Store pincode and move to categories
        conversation_data = customer.conversation_data
        conversation_data["delivery_pincode"] = pincode
        conversation_data["delivery_area"] = pincode_data.get("area_name", "")
        
        await update_whatsapp_customer(db, phone_number, {
            "current_step": "show_categories",
            "conversation_data": conversation_data
        })
        
        return f"""✅ *Great! We deliver to {pincode}*
📍 Area: {pincode_data.get('area_name', pincode)}

{await show_categories_interactive_list(db)}"""
    
    else:
        return """Please enter a valid 6-digit PIN CODE or share your location.

📱 Type *Back* to go to previous step"""

async def show_categories_interactive_list(db):
    """Show categories using Interactive List format"""
    categories = await db.categories.find({"is_active": True}).to_list(10)
    
    if not categories:
        return "Sorry, no products are currently available. Please contact support."
    
    message = """🛒 *Select Product Category*

Choose from our fresh dairy products:

"""
    
    for i, category in enumerate(categories, 1):
        message += f"{i}️⃣ *{category['name']}*\n"
        if category.get('description'):
            message += f"   _{category['description']}_\n"
        message += "\n"
    
    message += """Reply with the number of your choice.

📱 Type *Back* to go to previous step"""
    
    return message

async def handle_category_selection_interactive(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle category selection from interactive list"""
    try:
        categories = await db.categories.find({"is_active": True}).to_list(10)
        selected_index = int(message) - 1
        
        if 0 <= selected_index < len(categories):
            selected_category = categories[selected_index]
            
            # Update customer data
            conversation_data = customer.conversation_data
            conversation_data["selected_category_id"] = selected_category["id"]
            conversation_data["selected_category_name"] = selected_category["name"]
            
            await update_whatsapp_customer(db, phone_number, {
                "current_step": "show_products",
                "conversation_data": conversation_data
            })
            
            return await show_product_catalog(db, selected_category["id"])
        else:
            return f"""Please select a valid option (1-{len(categories)}).

📱 Type *Back* to go to previous step"""
            
    except ValueError:
        return """Please reply with a number to select a category.

📱 Type *Back* to go to previous step"""

async def show_product_catalog(db, category_id: str):
    """Show products using Multi-Product Message format"""
    # Get product types for the category
    product_types = await db.product_types.find({
        "category_id": category_id,
        "is_active": True
    }).to_list(30)
    
    if not product_types:
        return "No products available for this category."
    
    message = """🛒 *Product Catalog*

Select products to add to your cart:

"""
    
    for i, ptype in enumerate(product_types, 1):
        # Get characteristics for this product type
        characteristics = await db.characteristics.find({
            "product_type_id": ptype["id"],
            "is_active": True
        }).to_list(10)
        
        message += f"*{i}. {ptype['name']}*\n"
        
        for j, char in enumerate(characteristics):
            # Get sizes for this characteristic
            sizes = await db.sizes.find({
                "characteristic_id": char["id"],
                "is_active": True
            }).to_list(10)
            
            for size in sizes:
                message += f"   • {char['name']} - {size['value']} - ₹{size['price']:.2f}\n"
        
        message += "\n"
    
    message += """Reply with product numbers you want (e.g., "1,3,5" for multiple products)

📱 Type *Back* to go to previous step"""
    
    return message

async def handle_product_selection_catalog(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle product selection from catalog"""
    # For now, simplify and move to quantity/frequency selection
    conversation_data = customer.conversation_data
    conversation_data["selected_products"] = message.strip()
    
    await update_whatsapp_customer(db, phone_number, {
        "current_step": "select_quantity_frequency",
        "conversation_data": conversation_data
    })
    
    return await show_quantity_frequency_options()

async def show_quantity_frequency_options():
    """Show quantity and frequency options combined"""
    return """📦 *Quantity & Frequency Selection*

Choose your delivery option:

1️⃣ *1 bottle - One time* (₹25)
2️⃣ *1 bottle - Daily* (₹750/month)
3️⃣ *1 bottle - Alternate days* (₹375/month)
4️⃣ *2 bottles - One time* (₹50)
5️⃣ *2 bottles - Daily* (₹1500/month)
6️⃣ *2 bottles - Alternate days* (₹750/month)
7️⃣ *Custom quantity & frequency*

Reply with the number of your choice.

📱 Type *Back* to go to previous step"""

async def handle_quantity_frequency_selection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle quantity and frequency selection"""
    frequency_options = {
        "1": {"quantity": 1, "frequency": "once", "price": 25, "name": "1 bottle - One time"},
        "2": {"quantity": 1, "frequency": "daily", "price": 750, "name": "1 bottle - Daily"},
        "3": {"quantity": 1, "frequency": "alternate", "price": 375, "name": "1 bottle - Alternate days"},
        "4": {"quantity": 2, "frequency": "once", "price": 50, "name": "2 bottles - One time"},
        "5": {"quantity": 2, "frequency": "daily", "price": 1500, "name": "2 bottles - Daily"},
        "6": {"quantity": 2, "frequency": "alternate", "price": 750, "name": "2 bottles - Alternate days"},
        "7": {"quantity": 0, "frequency": "custom", "price": 0, "name": "Custom"}
    }
    
    if message.strip() in frequency_options:
        selected = frequency_options[message.strip()]
        
        conversation_data = customer.conversation_data
        conversation_data["selected_quantity"] = selected["quantity"]
        conversation_data["selected_frequency"] = selected["frequency"]
        conversation_data["selected_price"] = selected["price"]
        conversation_data["selection_name"] = selected["name"]
        
        await update_whatsapp_customer(db, phone_number, {
            "current_step": "select_delivery_slot",
            "conversation_data": conversation_data
        })
        
        return await show_delivery_slots()
    else:
        return f"""Please select a valid option (1-7).

📱 Type *Back* to go to previous step"""

async def show_delivery_slots():
    """Show available delivery time slots"""
    return """🕐 *Select Delivery Time Slot*

Choose your preferred delivery time:

1️⃣ *6:00 AM - 8:00 AM* (Morning Fresh)
2️⃣ *8:00 AM - 10:00 AM* (Morning Regular)

Reply with the number of your choice.

📱 Type *Back* to go to previous step"""

async def handle_delivery_slot_selection(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle delivery slot selection"""
    slot_options = {
        "1": "6:00 AM - 8:00 AM",
        "2": "8:00 AM - 10:00 AM"
    }
    
    if message.strip() in slot_options:
        selected_slot = slot_options[message.strip()]
        
        conversation_data = customer.conversation_data
        conversation_data["selected_slot"] = selected_slot
        
        await update_whatsapp_customer(db, phone_number, {
            "current_step": "collect_address",
            "conversation_data": conversation_data
        })
        
        return f"""✅ *Selected: {selected_slot}*

📝 *Please provide your complete delivery address:*

Include:
• House/Flat number
• Street name  
• Landmark (if any)
• Building name

📱 Type *Back* to go to previous step"""
    else:
        return """Please select a valid time slot (1 or 2).

📱 Type *Back* to go to previous step"""

async def handle_go_back(db, phone_number: str, customer: WhatsAppCustomer):
    """Handle go back navigation"""
    current_step = customer.current_step
    
    # Define step hierarchy for back navigation
    step_hierarchy = {
        "customer_type": "welcome",
        "capture_location": "customer_type", 
        "show_categories": "capture_location",
        "show_products": "show_categories",
        "select_quantity_frequency": "show_products",
        "select_delivery_slot": "select_quantity_frequency",
        "collect_address": "select_delivery_slot",
        "collect_name": "collect_address",
        "confirm_order": "collect_name",
        "self_service_menu": "existing_menu"
    }
    
    previous_step = step_hierarchy.get(current_step, "welcome")
    await update_whatsapp_customer(db, phone_number, {"current_step": previous_step})
    
    return "↩️ Going back to previous step..."

async def handle_self_service(db, phone_number: str, action: str, customer: WhatsAppCustomer):
    """Handle self-service options for existing customers"""
    if action == "pause":
        return """⏸️ *Subscription Paused*

Your subscription has been paused from tomorrow.
Type *RESUME* anytime to resume deliveries.

📱 Type *Back* to return to menu"""
    
    elif action == "skip tomorrow":
        return """⏭️ *Tomorrow Skipped*

Tomorrow's delivery has been skipped.
Next delivery as per regular schedule.

📱 Type *Back* to return to menu"""
    
    elif action == "change qty":
        return """🔢 *Change Quantity*

Current: 2 bottles daily
Enter new quantity (1-10):

📱 Type *Back* to return to menu"""
    
    elif action == "cancel subscription":
        return """❌ *Cancel Subscription*

Are you sure you want to cancel?
Reply *CONFIRM* to cancel or *BACK* to return.

📱 Type *Back* to return to menu"""

async def show_existing_customer_menu(db, customer: WhatsAppCustomer):
    """Show enhanced menu for existing customers"""
    return """👋 *Welcome back to Fresh Dairy!*

Choose an option:

1️⃣ *Repeat last order*
2️⃣ *Modify subscription*
3️⃣ *Change delivery address*  
4️⃣ *New order*
5️⃣ *Pause subscription*
6️⃣ *Skip tomorrow's delivery*
7️⃣ *Change quantity*
8️⃣ *Cancel subscription*

Reply with the number of your choice.

📱 Type *Back* to go to main menu"""

async def handle_existing_customer_menu(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle existing customer menu selection"""
    menu_options = {
        "1": "repeat_order",
        "2": "modify_subscription", 
        "3": "change_address",
        "4": "new_order",
        "5": "pause_subscription",
        "6": "skip_tomorrow",
        "7": "change_quantity",
        "8": "cancel_subscription"
    }
    
    if message.strip() in menu_options:
        action = menu_options[message.strip()]
        
        if action == "new_order":
            await update_whatsapp_customer(db, phone_number, {"current_step": "capture_location"})
            return await capture_location_request()
        elif action == "pause_subscription":
            return await handle_self_service(db, phone_number, "pause", customer)
        elif action == "skip_tomorrow":
            return await handle_self_service(db, phone_number, "skip tomorrow", customer)
        elif action == "change_quantity":
            return await handle_self_service(db, phone_number, "change qty", customer)
        elif action == "cancel_subscription":
            return await handle_self_service(db, phone_number, "cancel subscription", customer)
        else:
            return f"""🚧 *{action.replace('_', ' ').title()}* feature coming soon!

📱 Type *Back* to return to menu"""
    else:
        return """Please select a valid option (1-8).

📱 Type *Back* to return to main menu"""

async def handle_self_service_menu(db, phone_number: str, message: str, customer: WhatsAppCustomer):
    """Handle self-service menu interactions"""
    return await handle_existing_customer_menu(db, phone_number, message, customer)

# Duplicate function removed - using the updated version above

# WhatsApp Webhook Route
@api_router.post("/whatsapp")
async def whatsapp_webhook(request_data: dict):
    """Handle incoming WhatsApp messages from whapi.cloud"""
    try:
        messages = request_data.get("messages", [])
        
        for message_data in messages:
            # Extract message details
            chat_id = message_data.get("chat_id", "")
            message_text = message_data.get("text", {}).get("body", "")
            from_me = message_data.get("from_me", False)
            
            # Skip messages from us
            if from_me:
                continue
                
            # Extract phone number from chat_id
            phone_number = chat_id.replace("@s.whatsapp.net", "")
            
            # Process the message
            response = await process_whatsapp_message(db, phone_number, message_text)
            
            # Send response
            if response:
                await send_whatsapp_message(phone_number, response)
        
        return {"status": "success"}
        
    except Exception as e:
        print(f"WhatsApp webhook error: {e}")
        return {"status": "error", "message": str(e)}

# Manual WhatsApp send endpoint (for admin use)
@api_router.post("/admin/send-whatsapp")
async def send_whatsapp_admin(
    message_data: WhatsAppMessage,
    current_user: dict = Depends(get_current_user)
):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await send_whatsapp_message(message_data.chat_id, message_data.text)
    return {"success": result is not None, "result": result}

# Initialize admin user
@api_router.post("/init-admin")
async def init_admin():
    # Delete existing admin and recreate (for dev purposes)
    await db.admins.delete_many({})
    
    admin_data = {
        "id": str(uuid.uuid4()),
        "username": "admin",
        "password_hash": hash_password("admin123"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.admins.insert_one(admin_data)
    return {"message": "Admin created successfully", "username": "admin", "password": "admin123"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
