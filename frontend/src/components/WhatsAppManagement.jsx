import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { MessageCircle, Send, Users, ShoppingCart, BarChart3, Settings } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WhatsAppManagement = () => {
  const [whatsappCustomers, setWhatsappCustomers] = useState([]);
  const [whatsappOrders, setWhatsappOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  const [messageForm, setMessageForm] = useState({
    phone_number: '',
    message: ''
  });

  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    todayOrders: 0,
    pendingOrders: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch WhatsApp customers and orders
      const [customersRes, ordersRes] = await Promise.all([
        axios.get(`${API}/admin/whatsapp-customers`).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/whatsapp-orders`).catch(() => ({ data: [] }))
      ]);
      
      const customers = customersRes.data || [];
      const orders = ordersRes.data || [];
      
      setWhatsappCustomers(customers);
      setWhatsappOrders(orders);
      
      // Calculate stats
      const today = new Date().toDateString();
      const todayOrders = orders.filter(order => 
        new Date(order.created_at).toDateString() === today
      );
      const pendingOrders = orders.filter(order => 
        order.payment_status === 'pending'
      );
      
      setStats({
        totalCustomers: customers.length,
        totalOrders: orders.length,
        todayOrders: todayOrders.length,
        pendingOrders: pendingOrders.length
      });
      
    } catch (error) {
      console.error('Failed to load WhatsApp data:', error);
      toast.error('Failed to load WhatsApp data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!messageForm.phone_number || !messageForm.message) {
      toast.error('Please fill in all fields');
      return;
    }

    setSendingMessage(true);
    
    try {
      await axios.post(`${API}/admin/send-whatsapp`, {
        chat_id: messageForm.phone_number,
        text: messageForm.message
      });
      
      toast.success('Message sent successfully!');
      setMessageForm({ phone_number: '', message: '' });
      
    } catch (error) {
      toast.error('Failed to send message: ' + (error.response?.data?.detail || error.message));
    } finally {
      setSendingMessage(false);
    }
  };

  const formatPhoneNumber = (phone) => {
    return phone.replace(/\D/g, '').replace(/^91/, '+91 ');
  };

  const getOrderStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500', text: 'Pending' },
      success: { color: 'bg-green-500', text: 'Paid' },
      failed: { color: 'bg-red-500', text: 'Failed' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Badge className={`${config.color} text-white`}>
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading WhatsApp data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <MessageCircle className="w-5 h-5 text-green-600" />
                <span>WhatsApp Automation</span>
              </CardTitle>
              <CardDescription>
                Manage WhatsApp customers, orders, and automated responses
              </CardDescription>
            </div>
            <Badge className="bg-green-100 text-green-800">
              <MessageCircle className="w-3 h-3 mr-1" />
              +91 90075 09919
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">WhatsApp Customers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Today's Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover-card">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="broadcast">Broadcast</TabsTrigger>
          <TabsTrigger value="settings">Bot Settings</TabsTrigger>
        </TabsList>

        {/* WhatsApp Customers Tab */}
        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Customers</CardTitle>
              <CardDescription>Customers who have interacted via WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>WhatsApp Number</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Total Orders</TableHead>
                    <TableHead>Last Interaction</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whatsappCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">
                        {customer.name || 'Unknown'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <MessageCircle className="w-4 h-4 text-green-600" />
                          <span className="font-mono">{formatPhoneNumber(customer.whatsapp_number)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.pincode ? (
                          <div>
                            <p className="font-medium">{customer.pincode}</p>
                            <p className="text-sm text-gray-500 truncate max-w-32">{customer.address}</p>
                          </div>
                        ) : (
                          <span className="text-gray-500">No address</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {whatsappOrders.filter(order => order.customer_id === customer.id).length}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setMessageForm({
                            ...messageForm,
                            phone_number: customer.whatsapp_number
                          })}
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {whatsappCustomers.length === 0 && (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No WhatsApp customers yet</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Customers will appear here once they interact with your WhatsApp bot
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* WhatsApp Orders Tab */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Orders</CardTitle>
              <CardDescription>Orders placed via WhatsApp automation</CardDescription>
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
                    <TableHead>Order Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whatsappOrders.map((order) => {
                    const customer = whatsappCustomers.find(c => c.id === order.customer_id);
                    
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          {customer ? (
                            <div>
                              <p className="font-medium">{customer.name || 'Unknown'}</p>
                              <p className="text-sm text-gray-500">{formatPhoneNumber(customer.whatsapp_number)}</p>
                            </div>
                          ) : (
                            <span className="text-gray-500">Unknown Customer</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <ShoppingCart className="w-4 h-4 text-gray-400" />
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
                          {new Date(order.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {whatsappOrders.length === 0 && (
                <div className="text-center py-8">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No WhatsApp orders yet</p>
                  <p className="text-gray-400 text-sm mt-2">
                    Orders placed via WhatsApp will appear here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Broadcast Messages Tab */}
        <TabsContent value="broadcast">
          <Card>
            <CardHeader>
              <CardTitle>Send WhatsApp Message</CardTitle>
              <CardDescription>Send messages to customers via WhatsApp</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div>
                  <Label htmlFor="phone_number">Phone Number *</Label>
                  <Input
                    id="phone_number"
                    value={messageForm.phone_number}
                    onChange={(e) => setMessageForm({...messageForm, phone_number: e.target.value})}
                    placeholder="919876543210 (without + or spaces)"
                    className="font-mono"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Enter phone number with country code (e.g., 919876543210)
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={messageForm.message}
                    onChange={(e) => setMessageForm({...messageForm, message: e.target.value})}
                    placeholder="Type your message here..."
                    rows={4}
                  />
                </div>
                
                <Button 
                  type="submit"
                  disabled={sendingMessage || !messageForm.phone_number || !messageForm.message}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {sendingMessage ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </div>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bot Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>WhatsApp Bot Configuration</CardTitle>
              <CardDescription>Configure your WhatsApp automation settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">🤖 Bot Status</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>WhatsApp Number:</strong> +91 90075 09919</p>
                    <p><strong>API Status:</strong> <Badge className="bg-green-500 text-white">Active</Badge></p>
                    <p><strong>Webhook URL:</strong> https://dairyexpress.preview.emergentagent.com/api/whatsapp</p>
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">📱 Available Commands</h3>
                  <div className="space-y-1 text-sm text-blue-700">
                    <p>• <code>Hi/Hello</code> - Start new order</p>
                    <p>• <code>1</code> - New Customer</p>
                    <p>• <code>2</code> - Existing Customer</p>
                    <p>• Product catalog navigation with numbers</p>
                    <p>• <code>CONFIRM</code> - Confirm order</p>
                    <p>• <code>CANCEL</code> - Cancel order</p>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-800 mb-2">⚙️ Configuration</h3>
                  <div className="space-y-2 text-sm">
                    <p><strong>Order Cutoff Time:</strong> 10:00 PM</p>
                    <p><strong>Default Delivery Slots:</strong> 6:00-8:00, 8:00-10:00</p>
                    <p><strong>Product Sync:</strong> Auto-sync from admin panel</p>
                    <p><strong>Payment Integration:</strong> Ready for Razorpay</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhatsAppManagement;