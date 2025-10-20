import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Users, Package, Plus, UserPlus, Truck, LogOut, Settings, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import ProductManagement from './ProductManagement';
import PinCodeManagement from './PinCodeManagement';
import CustomerManagement from './CustomerManagement';
import WhatsAppManagement from './WhatsAppManagement';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminDashboard = ({ user, onLogout }) => {
  const [deliveryPersons, setDeliveryPersons] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddPersonDialog, setShowAddPersonDialog] = useState(false);
  const [showAddDeliveryDialog, setShowAddDeliveryDialog] = useState(false);
  const [showReassignDialog, setShowReassignDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState(null);
  
  const [newPerson, setNewPerson] = useState({
    name: '',
    phone: '',
    address: '',
    aadhar_number: '',
    bike_number: '',
    age: 25,
    gender: '',
    blood_group: '',
    pincode: '',
    time_of_work: '',
    password: ''
  });
  
  const [newDelivery, setNewDelivery] = useState({
    delivery_person_id: '',
    customer_name: '',
    customer_address: '',
    customer_phone: '',
    customer_whatsapp: '',
    customer_pincode: '',
    product_name: '',
    product_quantity: '',
    delivery_date: new Date().toISOString().split('T')[0]
  });
  
  const [reassignData, setReassignData] = useState({
    new_person_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [personsRes, deliveriesRes] = await Promise.all([
        axios.get(`${API}/admin/delivery-persons`),
        axios.get(`${API}/admin/deliveries`)
      ]);
      
      setDeliveryPersons(personsRes.data);
      setDeliveries(deliveriesRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPerson = async () => {
    try {
      // Create enhanced delivery person with all fields
      const enhancedPerson = {
        ...newPerson,
        selected_pincodes: [newPerson.pincode] // Add primary pincode to selected pincodes
      };
      
      await axios.post(`${API}/admin/delivery-persons`, enhancedPerson);
      toast.success('Delivery person added successfully');
      setShowAddPersonDialog(false);
      setNewPerson({
        name: '',
        phone: '',
        address: '',
        aadhar_number: '',
        bike_number: '',
        age: 25,
        gender: '',
        blood_group: '',
        pincode: '',
        time_of_work: '',
        password: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add delivery person');
    }
  };

  const handleAddDelivery = async () => {
    try {
      await axios.post(`${API}/admin/deliveries`, newDelivery);
      toast.success('Delivery added successfully');
      setShowAddDeliveryDialog(false);
      setNewDelivery({
        delivery_person_id: '',
        customer_name: '',
        customer_address: '',
        customer_phone: '',
        customer_whatsapp: '',
        customer_pincode: '',
        product_name: '',
        product_quantity: '',
        delivery_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add delivery');
    }
  };

  const handleReassign = async () => {
    try {
      await axios.put(
        `${API}/admin/deliveries/${selectedDelivery.id}/reassign?new_person_id=${reassignData.new_person_id}`
      );
      toast.success('Delivery reassigned successfully');
      setShowReassignDialog(false);
      setSelectedDelivery(null);
      setReassignData({ new_person_id: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reassign delivery');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'Pending' },
      delivered: { color: 'bg-green-500', icon: CheckCircle, text: 'Delivered' },
      not_delivered: { color: 'bg-red-500', icon: XCircle, text: 'Not Delivered' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <Badge className={`${config.color} text-white`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.text}
      </Badge>
    );
  };

  const getPersonName = (personId) => {
    const person = deliveryPersons.find(p => p.id === personId);
    return person ? person.name : 'Unknown';
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPerson({ ...newPerson, password });
  };

  const handlePasswordReset = async (person) => {
    try {
      const response = await axios.put(`${API}/admin/delivery-persons/${person.id}/reset-password`);
      setResetPasswordData({
        name: person.name,
        phone: person.phone,
        new_password: response.data.new_password
      });
      setShowPasswordDialog(true);
      toast.success('Password reset successfully');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  const totalDeliveries = deliveries.length;
  const completedDeliveries = deliveries.filter(d => d.status !== 'pending').length;
  const pendingDeliveries = totalDeliveries - completedDeliveries;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <Settings className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-gray-600">Manage deliveries and delivery persons</p>
              </div>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              className="flex items-center space-x-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              data-testid="admin-logout-btn"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Delivery Persons</p>
                  <p className="text-2xl font-bold text-gray-900">{deliveryPersons.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <Package className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Deliveries</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDeliveries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{completedDeliveries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover-card">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingDeliveries}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="deliveries" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-full max-w-4xl">
            <TabsTrigger value="deliveries" data-testid="admin-deliveries-tab">Deliveries</TabsTrigger>
            <TabsTrigger value="persons" data-testid="admin-persons-tab">Delivery Persons</TabsTrigger>
            <TabsTrigger value="products" data-testid="admin-products-tab">Products</TabsTrigger>
            <TabsTrigger value="pincodes" data-testid="admin-pincodes-tab">Pin Codes</TabsTrigger>
            <TabsTrigger value="customers" data-testid="admin-customers-tab">Customers</TabsTrigger>
          </TabsList>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>All Deliveries</CardTitle>
                    <CardDescription>Manage delivery assignments and status</CardDescription>
                  </div>
                  <Dialog open={showAddDeliveryDialog} onOpenChange={setShowAddDeliveryDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-delivery-btn">
                        <Plus className="w-4 h-4 mr-2" />
                        Add Delivery
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg" data-testid="add-delivery-dialog">
                      <DialogHeader>
                        <DialogTitle>Add New Delivery</DialogTitle>
                        <DialogDescription>
                          Create a new delivery assignment
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label htmlFor="delivery_person_id">Delivery Person *</Label>
                          <Select value={newDelivery.delivery_person_id} onValueChange={(value) => setNewDelivery({...newDelivery, delivery_person_id: value})}>
                            <SelectTrigger data-testid="select-delivery-person">
                              <SelectValue placeholder="Select delivery person" />
                            </SelectTrigger>
                            <SelectContent>
                              {deliveryPersons.map((person) => (
                                <SelectItem key={person.id} value={person.id}>
                                  {person.name} ({person.phone})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="customer_name">Customer Name *</Label>
                            <Input
                              value={newDelivery.customer_name}
                              onChange={(e) => setNewDelivery({...newDelivery, customer_name: e.target.value})}
                              placeholder="Customer name"
                              data-testid="customer-name-input"
                            />
                          </div>
                          <div>
                            <Label htmlFor="customer_phone">Phone *</Label>
                            <Input
                              value={newDelivery.customer_phone}
                              onChange={(e) => setNewDelivery({...newDelivery, customer_phone: e.target.value})}
                              placeholder="Phone number"
                              data-testid="customer-phone-input"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="customer_address">Address *</Label>
                          <Input
                            value={newDelivery.customer_address}
                            onChange={(e) => setNewDelivery({...newDelivery, customer_address: e.target.value})}
                            placeholder="Delivery address"
                            data-testid="customer-address-input"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="customer_whatsapp">WhatsApp</Label>
                            <Input
                              value={newDelivery.customer_whatsapp}
                              onChange={(e) => setNewDelivery({...newDelivery, customer_whatsapp: e.target.value})}
                              placeholder="WhatsApp number"
                              data-testid="customer-whatsapp-input"
                            />
                          </div>
                          <div>
                            <Label htmlFor="customer_pincode">Pin Code *</Label>
                            <Input
                              value={newDelivery.customer_pincode}
                              onChange={(e) => setNewDelivery({...newDelivery, customer_pincode: e.target.value})}
                              placeholder="Pin code"
                              data-testid="customer-pincode-input"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="product_name">Product Name *</Label>
                            <Input
                              value={newDelivery.product_name}
                              onChange={(e) => setNewDelivery({...newDelivery, product_name: e.target.value})}
                              placeholder="Product name"
                              data-testid="product-name-input"
                            />
                          </div>
                          <div>
                            <Label htmlFor="product_quantity">Quantity *</Label>
                            <Input
                              value={newDelivery.product_quantity}
                              onChange={(e) => setNewDelivery({...newDelivery, product_quantity: e.target.value})}
                              placeholder="Quantity"
                              data-testid="product-quantity-input"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="delivery_date">Delivery Date *</Label>
                          <Input
                            type="date"
                            value={newDelivery.delivery_date}
                            onChange={(e) => setNewDelivery({...newDelivery, delivery_date: e.target.value})}
                            data-testid="delivery-date-input"
                          />
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddDeliveryDialog(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddDelivery}
                          disabled={!newDelivery.delivery_person_id || !newDelivery.customer_name || !newDelivery.customer_phone || !newDelivery.customer_address || !newDelivery.customer_pincode || !newDelivery.product_name || !newDelivery.product_quantity}
                          data-testid="submit-add-delivery-btn"
                        >
                          Add Delivery
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Delivery Person</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((delivery) => (
                        <TableRow key={delivery.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{delivery.customer_name}</p>
                              <p className="text-sm text-gray-500">{delivery.customer_phone}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{delivery.product_name}</p>
                              <p className="text-sm text-gray-500">{delivery.product_quantity}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getPersonName(delivery.delivery_person_id)}</TableCell>
                          <TableCell>
                            {new Date(delivery.delivery_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{getStatusBadge(delivery.status)}</TableCell>
                          <TableCell>
                            {delivery.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedDelivery(delivery);
                                  setShowReassignDialog(true);
                                }}
                                data-testid={`reassign-btn-${delivery.id}`}
                              >
                                Reassign
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {deliveries.length === 0 && (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No deliveries found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <ProductManagement />
          </TabsContent>

          {/* Pin Codes Tab */}
          <TabsContent value="pincodes">
            <PinCodeManagement />
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <CustomerManagement />
          </TabsContent>

          {/* Delivery Persons Tab */}
          <TabsContent value="persons">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Delivery Persons</CardTitle>
                    <CardDescription>Manage delivery person accounts</CardDescription>
                  </div>
                  <Dialog open={showAddPersonDialog} onOpenChange={setShowAddPersonDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700" data-testid="add-person-btn">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add Person
                      </Button>
                    </DialogTrigger>
                    <DialogContent data-testid="add-person-dialog">
                      <DialogHeader>
                        <DialogTitle>Add New Delivery Person</DialogTitle>
                        <DialogDescription>
                          Create a new delivery person account
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            value={newPerson.name}
                            onChange={(e) => setNewPerson({...newPerson, name: e.target.value})}
                            placeholder="Full name"
                            data-testid="person-name-input"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            value={newPerson.phone}
                            onChange={(e) => setNewPerson({...newPerson, phone: e.target.value})}
                            placeholder="Phone number (will be used as username)"
                            data-testid="person-phone-input"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="address">Address *</Label>
                          <Input
                            value={newPerson.address || ''}
                            onChange={(e) => setNewPerson({...newPerson, address: e.target.value})}
                            placeholder="Complete address"
                            data-testid="person-address-input"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="aadhar">Aadhar Number *</Label>
                            <Input
                              value={newPerson.aadhar_number || ''}
                              onChange={(e) => setNewPerson({...newPerson, aadhar_number: e.target.value})}
                              placeholder="Aadhar number"
                              data-testid="person-aadhar-input"
                            />
                          </div>
                          <div>
                            <Label htmlFor="bike">Bike Number *</Label>
                            <Input
                              value={newPerson.bike_number || ''}
                              onChange={(e) => setNewPerson({...newPerson, bike_number: e.target.value})}
                              placeholder="Bike registration number"
                              data-testid="person-bike-input"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="age">Age *</Label>
                            <Input
                              type="number"
                              value={newPerson.age || ''}
                              onChange={(e) => setNewPerson({...newPerson, age: parseInt(e.target.value) || 0})}
                              placeholder="Age"
                              data-testid="person-age-input"
                            />
                          </div>
                          <div>
                            <Label htmlFor="gender">Gender *</Label>
                            <Select value={newPerson.gender || ''} onValueChange={(value) => setNewPerson({...newPerson, gender: value})}>
                              <SelectTrigger data-testid="person-gender-select">
                                <SelectValue placeholder="Select gender" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="blood-group">Blood Group</Label>
                            <Select value={newPerson.blood_group || ''} onValueChange={(value) => setNewPerson({...newPerson, blood_group: value})}>
                              <SelectTrigger data-testid="person-blood-group-select">
                                <SelectValue placeholder="Blood group" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A+">A+</SelectItem>
                                <SelectItem value="A-">A-</SelectItem>
                                <SelectItem value="B+">B+</SelectItem>
                                <SelectItem value="B-">B-</SelectItem>
                                <SelectItem value="AB+">AB+</SelectItem>
                                <SelectItem value="AB-">AB-</SelectItem>
                                <SelectItem value="O+">O+</SelectItem>
                                <SelectItem value="O-">O-</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="pincode">Working Pin Code *</Label>
                          <Input
                            value={newPerson.pincode}
                            onChange={(e) => setNewPerson({...newPerson, pincode: e.target.value})}
                            placeholder="Primary working area pin code"
                            data-testid="person-pincode-input"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="time-of-work">Work Hours *</Label>
                          <Select value={newPerson.time_of_work || ''} onValueChange={(value) => setNewPerson({...newPerson, time_of_work: value})}>
                            <SelectTrigger data-testid="person-time-of-work-select">
                              <SelectValue placeholder="Select work hours" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="5:30 AM - 12:00 PM">Morning Shift (5:30 AM - 12:00 PM)</SelectItem>
                              <SelectItem value="12:00 PM - 6:00 PM">Afternoon Shift (12:00 PM - 6:00 PM)</SelectItem>
                              <SelectItem value="6:00 PM - 10:00 PM">Evening Shift (6:00 PM - 10:00 PM)</SelectItem>
                              <SelectItem value="5:30 AM - 10:00 PM">Full Day (5:30 AM - 10:00 PM)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <div className="flex justify-between items-center mb-2">
                            <Label htmlFor="password">Password *</Label>
                            <Button 
                              type="button" 
                              size="sm" 
                              variant="outline" 
                              onClick={generatePassword}
                              data-testid="generate-password-btn"
                            >
                              Generate
                            </Button>
                          </div>
                          <Input
                            value={newPerson.password}
                            onChange={(e) => setNewPerson({...newPerson, password: e.target.value})}
                            placeholder="Password for login"
                            data-testid="person-password-input"
                          />
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddPersonDialog(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddPerson}
                          disabled={!newPerson.name || !newPerson.phone || !newPerson.address || !newPerson.aadhar_number || !newPerson.bike_number || !newPerson.gender || !newPerson.pincode || !newPerson.time_of_work || !newPerson.password}
                          data-testid="submit-add-person-btn"
                        >
                          Add Person
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Pin Code</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead>Total Deliveries</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveryPersons.map((person) => {
                        const personDeliveries = deliveries.filter(d => d.delivery_person_id === person.id);
                        return (
                          <TableRow key={person.id}>
                            <TableCell className="font-medium">{person.name}</TableCell>
                            <TableCell>{person.phone}</TableCell>
                            <TableCell>{person.pincode}</TableCell>
                            <TableCell>
                              {new Date(person.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{personDeliveries.length}</Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePasswordReset(person)}
                                data-testid={`reset-password-btn-${person.id}`}
                              >
                                Reset Password
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  {deliveryPersons.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No delivery persons found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reassign Dialog */}
      <Dialog open={showReassignDialog} onOpenChange={setShowReassignDialog}>
        <DialogContent data-testid="reassign-dialog">
          <DialogHeader>
            <DialogTitle>Reassign Delivery</DialogTitle>
            <DialogDescription>
              Reassign delivery for {selectedDelivery?.customer_name} to a different delivery person
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label htmlFor="new_person_id">New Delivery Person *</Label>
            <Select value={reassignData.new_person_id} onValueChange={(value) => setReassignData({new_person_id: value})}>
              <SelectTrigger data-testid="reassign-person-select">
                <SelectValue placeholder="Select new delivery person" />
              </SelectTrigger>
              <SelectContent>
                {deliveryPersons
                  .filter(person => person.id !== selectedDelivery?.delivery_person_id)
                  .map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name} ({person.phone})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReassignDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReassign}
              disabled={!reassignData.new_person_id}
              data-testid="submit-reassign-btn"
            >
              Reassign Delivery
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent data-testid="password-reset-dialog">
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <DialogDescription>
              New login credentials for {resetPasswordData?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg space-y-2">
              <div>
                <Label className="text-sm font-medium text-gray-700">Phone Number (Username):</Label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-lg">{resetPasswordData?.phone}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(resetPasswordData?.phone)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700">New Password:</Label>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-lg text-blue-600 font-bold">{resetPasswordData?.new_password}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigator.clipboard.writeText(resetPasswordData?.new_password)}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded-lg">
              <strong>Important:</strong> Share these credentials with the delivery person. They should use their phone number as username and the password above to login.
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowPasswordDialog(false)} className="w-full">
              Got It
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
