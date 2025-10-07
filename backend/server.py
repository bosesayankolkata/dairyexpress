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
                except:
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
    person_obj = DeliveryPerson(**person_dict)
    person_data = prepare_for_mongo(person_obj.dict())
    person_data["password_hash"] = password_hash
    
    await db.delivery_persons.insert_one(person_data)
    return person_obj

@api_router.get("/admin/delivery-persons", response_model=List[DeliveryPerson])
async def get_delivery_persons(current_user: dict = Depends(get_current_user)):
    if current_user["user_type"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    persons = await db.delivery_persons.find({}, {"password_hash": 0}).to_list(1000)
    return [DeliveryPerson(**parse_from_mongo(person)) for person in persons]

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
