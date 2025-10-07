import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Users, Phone, MapPin, Package, Star, Search, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Search filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPincode, setSelectedPincode] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [customersRes, ordersRes] = await Promise.all([
        axios.get(`${API}/admin/customers`),
        axios.get(`${API}/admin/orders`)
      ]);
      
      setCustomers(customersRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      toast.error('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedPincode) params.append('pincode', selectedPincode);

      const response = await axios.get(`${API}/admin/search?${params.toString()}`);
      setOrders(response.data.orders || []);
      toast.success('Search completed');
    } catch (error) {
      toast.error('Search failed');
    }
  };

  const getCustomerOrders = (customerId) => {
    return orders.filter(order => order.customer_id === customerId);
  };

  const getOrderStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Pending' },
      success: { color: 'bg-green-500', text: 'Success' },
      failed: { color: 'bg-red-500', text: 'Failed' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.whatsapp_number.includes(searchTerm) ||
    customer.pincode.includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Customer Management</span>
              </CardTitle>
              <CardDescription>
                View and manage customer data, orders, and feedback
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="customers">All Customers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="search">Search & Reports</TabsTrigger>
        </TabsList>

        {/* Customers Tab */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Customer Database</CardTitle>
                <div className="flex items-center space-x-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>WhatsApp Number</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Last Order</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => {
                    const customerOrders = getCustomerOrders(customer.id);
                    const lastOrder = customerOrders.sort((a, b) => 
                      new Date(b.created_at) - new Date(a.created_at)
                    )[0];

                    return (
                      <TableRow key={customer.id}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-gray-400" />
                            <span className="font-mono">{customer.whatsapp_number}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="font-medium">{customer.pincode}</p>
                              <p className="text-sm text-gray-500 truncate max-w-32">{customer.address}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{customerOrders.length}</Badge>
                        </TableCell>
                        <TableCell>
                          {lastOrder ? (
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(lastOrder.created_at).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-500">₹{lastOrder.total_amount}</p>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">No orders</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {filteredCustomers.length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'No customers found for your search' : 'No customers found'}
                  </p>
                  <p className="text-gray-400 text-sm mt-2">
                    Customers will appear here once they place orders via WhatsApp
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Order History</CardTitle>
              <CardDescription>View all customer orders and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order Number</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Delivery Status</TableHead>
                    <TableHead>Order Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const customer = customers.find(c => c.id === order.customer_id);
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium">{order.order_number}</TableCell>
                        <TableCell>
                          {customer ? (
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              <p className="text-sm text-gray-500">{customer.whatsapp_number}</p>
                            </div>
                          ) : (
                            <span className="text-gray-500">Unknown Customer</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-gray-400" />
                            <span>{order.items?.length || 0} items</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          ₹{order.total_amount?.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {getOrderStatusBadge(order.payment_status)}
                        </TableCell>
                        <TableCell>
                          {getOrderStatusBadge(order.delivery_status)}
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {orders.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No orders found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Orders will appear here once customers place them via WhatsApp
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Search & Reports Tab */}
        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Search & Reports</CardTitle>
              <CardDescription>Search orders by date range, pin code, and delivery person</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Date
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Date
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pin Code
                    </label>
                    <Input
                      value={selectedPincode}
                      onChange={(e) => setSelectedPincode(e.target.value)}
                      placeholder="e.g., 110001"
                    />
                  </div>
                  
                  <div className="flex items-end">
                    <Button onClick={handleSearch} className="w-full">
                      <Search className="w-4 h-4 mr-2" />
                      Search
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Search Results</h3>
                  
                  {orders.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{orders.length}</div>
                            <div className="text-sm text-gray-600">Total Orders</div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">
                              ₹{orders.reduce((sum, order) => sum + (order.total_amount || 0), 0).toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">Total Revenue</div>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {new Set(orders.map(order => order.customer_id)).size}
                            </div>
                            <div className="text-sm text-gray-600">Unique Customers</div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No orders found for selected criteria</p>
                      <p className="text-gray-400 text-sm mt-2">Try adjusting your search parameters</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerManagement;