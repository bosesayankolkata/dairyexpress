import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { User, Package, MapPin, Phone, MessageCircle, Calendar, CheckCircle, XCircle, Clock, LogOut, BarChart3, Truck } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DeliveryPersonDashboard = ({ user, onLogout }) => {
  const [profile, setProfile] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [statusUpdate, setStatusUpdate] = useState({
    status: '',
    reason: '',
    comments: ''
  });
  const [showStatusDialog, setShowStatusDialog] = useState(false);

  const notDeliveredReasons = [
    'Customer refuses delivery',
    'Delivery delay',
    'Bad Weather',
    'Customer not reachable',
    'Damaged or defective item',
    'Incomplete or incorrect addresses',
    'Incorrect addresses',
    'Incorrect order',
    'Problems with payment',
    'Unrealistic expectations'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileRes, deliveriesRes, statsRes] = await Promise.all([
        axios.get(`${API}/delivery-person/profile`),
        axios.get(`${API}/delivery-person/deliveries`),
        axios.get(`${API}/delivery-person/stats`)
      ]);
      
      setProfile(profileRes.data);
      setDeliveries(deliveriesRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (delivery, status) => {
    setSelectedDelivery(delivery);
    setStatusUpdate({ status, reason: '', comments: '' });
    setShowStatusDialog(true);
  };

  const submitStatusUpdate = async () => {
    try {
      await axios.put(`${API}/delivery-person/deliveries/${selectedDelivery.id}/status`, statusUpdate);
      toast.success('Delivery status updated successfully');
      setShowStatusDialog(false);
      fetchData(); // Refresh data
    } catch (error) {
      toast.error('Failed to update delivery status');
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

  const groupDeliveriesByDate = (deliveries) => {
    return deliveries.reduce((groups, delivery) => {
      const date = delivery.delivery_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(delivery);
      return groups;
    }, {});
  };

  const pendingDeliveries = deliveries.filter(d => d.status === 'pending');
  const completedDeliveries = deliveries.filter(d => d.status !== 'pending');
  const groupedPending = groupDeliveriesByDate(pendingDeliveries);
  const groupedCompleted = groupDeliveriesByDate(completedDeliveries);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Delivery Dashboard</h1>
                <p className="text-gray-600">Welcome back, {profile?.name}!</p>
              </div>
            </div>
            <Button
              onClick={onLogout}
              variant="outline"
              className="flex items-center space-x-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="deliveries" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-96">
            <TabsTrigger value="deliveries" data-testid="deliveries-tab">Deliveries</TabsTrigger>
            <TabsTrigger value="profile" data-testid="profile-tab">Profile</TabsTrigger>
            <TabsTrigger value="stats" data-testid="stats-tab">Statistics</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="hover-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Profile Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center md:text-left">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto md:mx-0 mb-4">
                      <User className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900">{profile?.name}</h3>
                    <p className="text-gray-600">Delivery Person</p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Phone Number</p>
                        <p className="font-medium">{profile?.phone}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <MapPin className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-500">Location Pin Code</p>
                        <p className="font-medium">{profile?.pincode}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Quick Stats</h4>
                    {stats && (
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-600">Total Deliveries:</span> <span className="font-medium">{stats.total_deliveries}</span></p>
                        <p><span className="text-gray-600">Completed:</span> <span className="font-medium text-green-600">{stats.completed_deliveries}</span></p>
                        <p><span className="text-gray-600">Pending:</span> <span className="font-medium text-yellow-600">{stats.pending_deliveries}</span></p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deliveries Tab */}
          <TabsContent value="deliveries">
            <Tabs defaultValue="pending" className="space-y-4">
              <TabsList>
                <TabsTrigger value="pending" data-testid="pending-deliveries-tab">
                  Pending ({pendingDeliveries.length})
                </TabsTrigger>
                <TabsTrigger value="completed" data-testid="completed-deliveries-tab">
                  Completed ({completedDeliveries.length})
                </TabsTrigger>
              </TabsList>

              {/* Pending Deliveries */}
              <TabsContent value="pending">
                <div className="space-y-6">
                  {Object.entries(groupedPending).map(([date, dayDeliveries]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </h3>
                        <Badge variant="outline">{dayDeliveries.length} deliveries</Badge>
                      </div>
                      
                      <div className="grid gap-4">
                        {dayDeliveries.map((delivery) => (
                          <Card key={delivery.id} className="hover-card" data-testid={`delivery-card-${delivery.id}`}>
                            <CardContent className="p-6">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-2">
                                  <Package className="w-5 h-5 text-blue-600" />
                                  <h4 className="font-semibold text-gray-900">{delivery.customer_name}</h4>
                                  {getStatusBadge(delivery.status)}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-gray-500">Address</p>
                                  <p className="font-medium">{delivery.customer_address}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Phone</p>
                                  <p className="font-medium">{delivery.customer_phone}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">WhatsApp</p>
                                  <p className="font-medium">{delivery.customer_whatsapp}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Pin Code</p>
                                  <p className="font-medium">{delivery.customer_pincode}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Product</p>
                                  <p className="font-medium">{delivery.product_name}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-500">Quantity</p>
                                  <p className="font-medium">{delivery.product_quantity}</p>
                                </div>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleStatusUpdate(delivery, 'delivered')}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  data-testid={`mark-delivered-btn-${delivery.id}`}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Mark Delivered
                                </Button>
                                <Button
                                  onClick={() => handleStatusUpdate(delivery, 'not_delivered')}
                                  variant="destructive"
                                  data-testid={`mark-not-delivered-btn-${delivery.id}`}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Not Delivered
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {pendingDeliveries.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No pending deliveries</p>
                        <p className="text-gray-400 text-sm mt-2">All caught up! Great job!</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Completed Deliveries */}
              <TabsContent value="completed">
                <div className="space-y-6">
                  {Object.entries(groupedCompleted).map(([date, dayDeliveries]) => (
                    <div key={date} className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {new Date(date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </h3>
                        <Badge variant="outline">{dayDeliveries.length} deliveries</Badge>
                      </div>
                      
                      <div className="grid gap-4">
                        {dayDeliveries.map((delivery) => (
                          <Card key={delivery.id} className="opacity-75 hover:opacity-100 transition-opacity">
                            <CardContent className="p-6">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-2">
                                  <Package className="w-5 h-5 text-blue-600" />
                                  <h4 className="font-semibold text-gray-900">{delivery.customer_name}</h4>
                                  {getStatusBadge(delivery.status)}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm text-gray-500">Product</p>
                                  <p className="font-medium">{delivery.product_name} ({delivery.product_quantity})</p>
                                </div>
                                {delivery.reason && (
                                  <div>
                                    <p className="text-sm text-gray-500">Reason</p>
                                    <p className="font-medium text-red-600">{delivery.reason}</p>
                                  </div>
                                )}
                                {delivery.comments && (
                                  <div>
                                    <p className="text-sm text-gray-500">Comments</p>
                                    <p className="font-medium">{delivery.comments}</p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {completedDeliveries.length === 0 && (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No completed deliveries yet</p>
                        <p className="text-gray-400 text-sm mt-2">Start completing deliveries to see them here</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Statistics Tab */}
          <TabsContent value="stats">
            {stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="hover-card">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Total Deliveries</p>
                          <p className="text-2xl font-bold text-gray-900">{stats.total_deliveries}</p>
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
                          <p className="text-2xl font-bold text-gray-900">{stats.completed_deliveries}</p>
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
                          <p className="text-2xl font-bold text-gray-900">{stats.pending_deliveries}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="hover-card">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5" />
                      <span>Daily Statistics</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(stats.daily_stats).map(([date, dayStats]) => (
                        <div key={date} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">
                              {new Date(date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </p>
                          </div>
                          <div className="flex space-x-6 text-sm">
                            <span className="text-gray-600">Total: <strong>{dayStats.total}</strong></span>
                            <span className="text-green-600">Completed: <strong>{dayStats.completed}</strong></span>
                            <span className="text-yellow-600">Pending: <strong>{dayStats.pending}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Update Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent data-testid="status-update-dialog">
          <DialogHeader>
            <DialogTitle>
              {statusUpdate.status === 'delivered' ? 'Mark as Delivered' : 'Mark as Not Delivered'}
            </DialogTitle>
            <DialogDescription>
              Update the delivery status for {selectedDelivery?.customer_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {statusUpdate.status === 'not_delivered' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for non-delivery *
                </label>
                <Select value={statusUpdate.reason} onValueChange={(value) => setStatusUpdate({...statusUpdate, reason: value})}>
                  <SelectTrigger data-testid="not-delivered-reason-select">
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {notDeliveredReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {statusUpdate.status === 'delivered' ? 'Comments (Optional)' : 'Additional Comments (Optional)'}
              </label>
              <Textarea
                value={statusUpdate.comments}
                onChange={(e) => setStatusUpdate({...statusUpdate, comments: e.target.value})}
                placeholder={statusUpdate.status === 'delivered' ? 'Any additional notes about the delivery...' : 'Additional details about why delivery could not be completed...'}
                rows={3}
                data-testid="delivery-comments-textarea"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={submitStatusUpdate}
              disabled={statusUpdate.status === 'not_delivered' && !statusUpdate.reason}
              className={statusUpdate.status === 'delivered' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              data-testid="submit-status-update-btn"
            >
              {statusUpdate.status === 'delivered' ? 'Mark Delivered' : 'Mark Not Delivered'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryPersonDashboard;
