import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { MapPin, Plus, Clock, IndianRupee, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PinCodeManagement = () => {
  const [pincodes, setPincodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPincodeDialog, setShowPincodeDialog] = useState(false);
  const [editingPincode, setEditingPincode] = useState(null);

  const [newPincode, setNewPincode] = useState({
    pincode: '',
    area_name: '',
    is_serviceable: true,
    available_time_slots: [],
    delivery_charge: 0
  });

  const [timeSlotInput, setTimeSlotInput] = useState('');

  const defaultTimeSlots = [
    '6:00-8:00',
    '8:00-10:00', 
    '10:00-12:00',
    '4:00-6:00',
    '6:00-8:00'
  ];

  useEffect(() => {
    fetchPincodes();
  }, []);

  const fetchPincodes = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/admin/pincodes`);
      setPincodes(response.data);
    } catch (error) {
      toast.error('Failed to load pin codes');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNewPincode({
      pincode: '',
      area_name: '',
      is_serviceable: true,
      available_time_slots: [],
      delivery_charge: 0
    });
    setTimeSlotInput('');
    setEditingPincode(null);
  };

  const handleAddTimeSlot = () => {
    if (timeSlotInput.trim() && !newPincode.available_time_slots.includes(timeSlotInput.trim())) {
      setNewPincode({
        ...newPincode,
        available_time_slots: [...newPincode.available_time_slots, timeSlotInput.trim()]
      });
      setTimeSlotInput('');
    }
  };

  const handleRemoveTimeSlot = (slotToRemove) => {
    setNewPincode({
      ...newPincode,
      available_time_slots: newPincode.available_time_slots.filter(slot => slot !== slotToRemove)
    });
  };

  const handleAddDefaultTimeSlot = (slot) => {
    if (!newPincode.available_time_slots.includes(slot)) {
      setNewPincode({
        ...newPincode,
        available_time_slots: [...newPincode.available_time_slots, slot]
      });
    }
  };

  const handleCreatePincode = async () => {
    try {
      if (editingPincode) {
        await axios.put(`${API}/admin/pincodes/${editingPincode.id}`, newPincode);
        toast.success('Pin code updated successfully');
      } else {
        await axios.post(`${API}/admin/pincodes`, newPincode);
        toast.success('Pin code created successfully');
      }
      
      setShowPincodeDialog(false);
      resetForm();
      fetchPincodes();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${editingPincode ? 'update' : 'create'} pin code`);
    }
  };

  const handleEditPincode = (pincode) => {
    setNewPincode({
      pincode: pincode.pincode,
      area_name: pincode.area_name,
      is_serviceable: pincode.is_serviceable,
      available_time_slots: pincode.available_time_slots || [],
      delivery_charge: pincode.delivery_charge || 0
    });
    setEditingPincode(pincode);
    setShowPincodeDialog(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading pin codes...</p>
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
                <MapPin className="w-5 h-5" />
                <span>Pin Code Management</span>
              </CardTitle>
              <CardDescription>
                Manage delivery areas, time slots, and service availability
              </CardDescription>
            </div>
            <Dialog open={showPincodeDialog} onOpenChange={(open) => {
              setShowPincodeDialog(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Pin Code
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPincode ? 'Edit Pin Code' : 'Add New Pin Code'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingPincode ? 'Update pin code details and service settings' : 'Add a new serviceable pin code area'}
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pincode">Pin Code *</Label>
                      <Input
                        value={newPincode.pincode}
                        onChange={(e) => setNewPincode({...newPincode, pincode: e.target.value})}
                        placeholder="e.g., 110001"
                        maxLength={6}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="area-name">Area Name *</Label>
                      <Input
                        value={newPincode.area_name}
                        onChange={(e) => setNewPincode({...newPincode, area_name: e.target.value})}
                        placeholder="e.g., Connaught Place, Delhi"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="delivery-charge">Delivery Charge (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newPincode.delivery_charge}
                      onChange={(e) => setNewPincode({...newPincode, delivery_charge: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Available Time Slots</Label>
                    
                    {/* Quick Add Default Slots */}
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-gray-600 mr-2">Quick add:</span>
                      {defaultTimeSlots.map((slot) => (
                        <Button
                          key={slot}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddDefaultTimeSlot(slot)}
                          disabled={newPincode.available_time_slots.includes(slot)}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>

                    {/* Custom Time Slot Input */}
                    <div className="flex space-x-2">
                      <Input
                        value={timeSlotInput}
                        onChange={(e) => setTimeSlotInput(e.target.value)}
                        placeholder="e.g., 12:00-14:00"
                      />
                      <Button type="button" onClick={handleAddTimeSlot} variant="outline">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Selected Time Slots */}
                    <div className="flex flex-wrap gap-2">
                      {newPincode.available_time_slots.map((slot) => (
                        <Badge 
                          key={slot} 
                          variant="secondary" 
                          className="cursor-pointer hover:bg-red-100"
                          onClick={() => handleRemoveTimeSlot(slot)}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {slot}
                          <XCircle className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                    
                    {newPincode.available_time_slots.length === 0 && (
                      <p className="text-sm text-gray-500">No time slots added yet. Add time slots for delivery scheduling.</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={newPincode.is_serviceable}
                      onCheckedChange={(checked) => setNewPincode({...newPincode, is_serviceable: checked})}
                    />
                    <Label>Service Available</Label>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowPincodeDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreatePincode}
                    disabled={!newPincode.pincode || !newPincode.area_name}
                  >
                    {editingPincode ? 'Update' : 'Create'} Pin Code
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pin Code</TableHead>
                <TableHead>Area Name</TableHead>
                <TableHead>Service Status</TableHead>
                <TableHead>Time Slots</TableHead>
                <TableHead>Delivery Charge</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pincodes.map((pincode) => (
                <TableRow key={pincode.id}>
                  <TableCell className="font-mono font-medium">{pincode.pincode}</TableCell>
                  <TableCell>{pincode.area_name}</TableCell>
                  <TableCell>
                    <Badge variant={pincode.is_serviceable ? "success" : "destructive"}>
                      {pincode.is_serviceable ? (
                        <><CheckCircle className="w-3 h-3 mr-1" />Available</>
                      ) : (
                        <><XCircle className="w-3 h-3 mr-1" />Not Available</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(pincode.available_time_slots || []).slice(0, 3).map((slot) => (
                        <Badge key={slot} variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          {slot}
                        </Badge>
                      ))}
                      {(pincode.available_time_slots || []).length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(pincode.available_time_slots || []).length - 3} more
                        </Badge>
                      )}
                      {(!pincode.available_time_slots || pincode.available_time_slots.length === 0) && (
                        <span className="text-sm text-gray-500">No slots</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-green-600">
                      <IndianRupee className="w-3 h-3 mr-1" />
                      {pincode.delivery_charge ? pincode.delivery_charge.toFixed(2) : '0.00'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(pincode.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditPincode(pincode)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {pincodes.length === 0 && (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No pin codes found</p>
              <p className="text-gray-400 text-sm mt-2">Add pin codes to enable delivery services</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PinCodeManagement;