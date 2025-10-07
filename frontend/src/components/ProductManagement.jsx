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
import { Switch } from './ui/switch';
import { Package, Plus, Edit3, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProductManagement = () => {
  const [categories, setCategories] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [characteristics, setCharacteristics] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showProductTypeDialog, setShowProductTypeDialog] = useState(false);
  const [showCharacteristicDialog, setShowCharacteristicDialog] = useState(false);
  const [showSizeDialog, setShowSizeDialog] = useState(false);

  // Form data states
  const [newCategory, setNewCategory] = useState({ name: '', description: '', is_active: true });
  const [newProductType, setNewProductType] = useState({ name: '', category_id: '', description: '', is_active: true });
  const [newCharacteristic, setNewCharacteristic] = useState({ name: '', product_type_id: '', description: '', is_active: true });
  const [newSize, setNewSize] = useState({ name: '', value: '', characteristic_id: '', price: 0, is_active: true });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [categoriesRes, productTypesRes, characteristicsRes, sizesRes] = await Promise.all([
        axios.get(`${API}/admin/categories`),
        axios.get(`${API}/admin/product-types`),
        axios.get(`${API}/admin/characteristics`),
        axios.get(`${API}/admin/sizes`)
      ]);
      
      setCategories(categoriesRes.data);
      setProductTypes(productTypesRes.data);
      setCharacteristics(characteristicsRes.data);
      setSizes(sizesRes.data);
    } catch (error) {
      toast.error('Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async () => {
    try {
      await axios.post(`${API}/admin/categories`, newCategory);
      toast.success('Category created successfully');
      setShowCategoryDialog(false);
      setNewCategory({ name: '', description: '', is_active: true });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create category');
    }
  };

  const handleCreateProductType = async () => {
    try {
      await axios.post(`${API}/admin/product-types`, newProductType);
      toast.success('Product type created successfully');
      setShowProductTypeDialog(false);
      setNewProductType({ name: '', category_id: '', description: '', is_active: true });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create product type');
    }
  };

  const handleCreateCharacteristic = async () => {
    try {
      await axios.post(`${API}/admin/characteristics`, newCharacteristic);
      toast.success('Characteristic created successfully');
      setShowCharacteristicDialog(false);
      setNewCharacteristic({ name: '', product_type_id: '', description: '', is_active: true });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create characteristic');
    }
  };

  const handleCreateSize = async () => {
    try {
      await axios.post(`${API}/admin/sizes`, newSize);
      toast.success('Size created successfully');
      setShowSizeDialog(false);
      setNewSize({ name: '', value: '', characteristic_id: '', price: 0, is_active: true });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create size');
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const getProductTypeName = (productTypeId) => {
    const productType = productTypes.find(pt => pt.id === productTypeId);
    return productType ? productType.name : 'Unknown';
  };

  const getCharacteristicName = (characteristicId) => {
    const characteristic = characteristics.find(c => c.id === characteristicId);
    return characteristic ? characteristic.name : 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading product management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Product Management</h2>
          <p className="text-gray-600">Manage categories, products, characteristics, and sizes</p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="product-types">Product Types</TabsTrigger>
          <TabsTrigger value="characteristics">Characteristics</TabsTrigger>
          <TabsTrigger value="sizes">Sizes & Pricing</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Product Categories</CardTitle>
                  <CardDescription>Manage main product categories (Milk, Ghee, Paneer, etc.)</CardDescription>
                </div>
                <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                      <DialogDescription>Create a new product category</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="category-name">Category Name *</Label>
                        <Input
                          value={newCategory.name}
                          onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                          placeholder="e.g., Cow Milk, Buffalo Milk, Ghee"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="category-description">Description</Label>
                        <Input
                          value={newCategory.description}
                          onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                          placeholder="Optional description"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={newCategory.is_active}
                          onCheckedChange={(checked) => setNewCategory({...newCategory, is_active: checked})}
                        />
                        <Label>Active</Label>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
                      <Button 
                        onClick={handleCreateCategory}
                        disabled={!newCategory.name}
                      >
                        Create Category
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
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell>{category.description || 'No description'}</TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "success" : "secondary"}>
                          {category.is_active ? (
                            <><Eye className="w-3 h-3 mr-1" />Active</>
                          ) : (
                            <><EyeOff className="w-3 h-3 mr-1" />Inactive</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(category.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {categories.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No categories found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product Types Tab */}
        <TabsContent value="product-types">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Product Types</CardTitle>
                  <CardDescription>Manage product types within categories (Single Tone, Double Tone, etc.)</CardDescription>
                </div>
                <Dialog open={showProductTypeDialog} onOpenChange={setShowProductTypeDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Product Type
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Product Type</DialogTitle>
                      <DialogDescription>Create a new product type within a category</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="category-select">Category *</Label>
                        <Select value={newProductType.category_id} onValueChange={(value) => setNewProductType({...newProductType, category_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.filter(c => c.is_active).map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="product-type-name">Product Type Name *</Label>
                        <Input
                          value={newProductType.name}
                          onChange={(e) => setNewProductType({...newProductType, name: e.target.value})}
                          placeholder="e.g., Single Tone Milk, Double Tone Milk"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="product-type-description">Description</Label>
                        <Input
                          value={newProductType.description}
                          onChange={(e) => setNewProductType({...newProductType, description: e.target.value})}
                          placeholder="Optional description"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={newProductType.is_active}
                          onCheckedChange={(checked) => setNewProductType({...newProductType, is_active: checked})}
                        />
                        <Label>Active</Label>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowProductTypeDialog(false)}>Cancel</Button>
                      <Button 
                        onClick={handleCreateProductType}
                        disabled={!newProductType.name || !newProductType.category_id}
                      >
                        Create Product Type
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
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productTypes.map((productType) => (
                    <TableRow key={productType.id}>
                      <TableCell className="font-medium">{productType.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getCategoryName(productType.category_id)}</Badge>
                      </TableCell>
                      <TableCell>{productType.description || 'No description'}</TableCell>
                      <TableCell>
                        <Badge variant={productType.is_active ? "success" : "secondary"}>
                          {productType.is_active ? (
                            <><Eye className="w-3 h-3 mr-1" />Active</>
                          ) : (
                            <><EyeOff className="w-3 h-3 mr-1" />Inactive</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(productType.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {productTypes.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No product types found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Characteristics Tab */}
        <TabsContent value="characteristics">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Product Characteristics</CardTitle>
                  <CardDescription>Manage product characteristics and variants</CardDescription>
                </div>
                <Dialog open={showCharacteristicDialog} onOpenChange={setShowCharacteristicDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Characteristic
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Characteristic</DialogTitle>
                      <DialogDescription>Create a new product characteristic</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="product-type-select">Product Type *</Label>
                        <Select value={newCharacteristic.product_type_id} onValueChange={(value) => setNewCharacteristic({...newCharacteristic, product_type_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product type" />
                          </SelectTrigger>
                          <SelectContent>
                            {productTypes.filter(pt => pt.is_active).map((productType) => (
                              <SelectItem key={productType.id} value={productType.id}>
                                {productType.name} ({getCategoryName(productType.category_id)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label htmlFor="characteristic-name">Characteristic Name *</Label>
                        <Input
                          value={newCharacteristic.name}
                          onChange={(e) => setNewCharacteristic({...newCharacteristic, name: e.target.value})}
                          placeholder="e.g., Premium, Regular, Organic"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="characteristic-description">Description</Label>
                        <Input
                          value={newCharacteristic.description}
                          onChange={(e) => setNewCharacteristic({...newCharacteristic, description: e.target.value})}
                          placeholder="Optional description"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={newCharacteristic.is_active}
                          onCheckedChange={(checked) => setNewCharacteristic({...newCharacteristic, is_active: checked})}
                        />
                        <Label>Active</Label>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowCharacteristicDialog(false)}>Cancel</Button>
                      <Button 
                        onClick={handleCreateCharacteristic}
                        disabled={!newCharacteristic.name || !newCharacteristic.product_type_id}
                      >
                        Create Characteristic
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
                    <TableHead>Name</TableHead>
                    <TableHead>Product Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {characteristics.map((characteristic) => {
                    const productType = productTypes.find(pt => pt.id === characteristic.product_type_id);
                    return (
                      <TableRow key={characteristic.id}>
                        <TableCell className="font-medium">{characteristic.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getProductTypeName(characteristic.product_type_id)}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{productType ? getCategoryName(productType.category_id) : 'Unknown'}</Badge>
                        </TableCell>
                        <TableCell>{characteristic.description || 'No description'}</TableCell>
                        <TableCell>
                          <Badge variant={characteristic.is_active ? "success" : "secondary"}>
                            {characteristic.is_active ? (
                              <><Eye className="w-3 h-3 mr-1" />Active</>
                            ) : (
                              <><EyeOff className="w-3 h-3 mr-1" />Inactive</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(characteristic.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {characteristics.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No characteristics found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sizes & Pricing Tab */}
        <TabsContent value="sizes">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Sizes & Pricing</CardTitle>
                  <CardDescription>Manage product sizes and their pricing (250ml, 500ml, 1L, etc.)</CardDescription>
                </div>
                <Dialog open={showSizeDialog} onOpenChange={setShowSizeDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Size
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Size</DialogTitle>
                      <DialogDescription>Create a new product size with pricing</DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="characteristic-select">Characteristic *</Label>
                        <Select value={newSize.characteristic_id} onValueChange={(value) => setNewSize({...newSize, characteristic_id: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select characteristic" />
                          </SelectTrigger>
                          <SelectContent>
                            {characteristics.filter(c => c.is_active).map((characteristic) => {
                              const productType = productTypes.find(pt => pt.id === characteristic.product_type_id);
                              return (
                                <SelectItem key={characteristic.id} value={characteristic.id}>
                                  {characteristic.name} - {getProductTypeName(characteristic.product_type_id)} ({productType ? getCategoryName(productType.category_id) : 'Unknown'})
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="size-name">Size Name *</Label>
                          <Input
                            value={newSize.name}
                            onChange={(e) => setNewSize({...newSize, name: e.target.value})}
                            placeholder="e.g., Small, Medium, Large"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="size-value">Size Value *</Label>
                          <Input
                            value={newSize.value}
                            onChange={(e) => setNewSize({...newSize, value: e.target.value})}
                            placeholder="e.g., 250ml, 500ml, 1L"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <Label htmlFor="size-price">Price (₹) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={newSize.price}
                          onChange={(e) => setNewSize({...newSize, price: parseFloat(e.target.value) || 0})}
                          placeholder="e.g., 25.00"
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={newSize.is_active}
                          onCheckedChange={(checked) => setNewSize({...newSize, is_active: checked})}
                        />
                        <Label>Active</Label>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowSizeDialog(false)}>Cancel</Button>
                      <Button 
                        onClick={handleCreateSize}
                        disabled={!newSize.name || !newSize.value || !newSize.characteristic_id || newSize.price <= 0}
                      >
                        Create Size
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
                    <TableHead>Size Name</TableHead>
                    <TableHead>Size Value</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Characteristic</TableHead>
                    <TableHead>Product Hierarchy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sizes.map((size) => {
                    const characteristic = characteristics.find(c => c.id === size.characteristic_id);
                    const productType = characteristic ? productTypes.find(pt => pt.id === characteristic.product_type_id) : null;
                    
                    return (
                      <TableRow key={size.id}>
                        <TableCell className="font-medium">{size.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{size.value}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">₹{size.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getCharacteristicName(size.characteristic_id)}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-gray-600">
                            {productType ? getCategoryName(productType.category_id) : 'Unknown'} → {productType ? productType.name : 'Unknown'} → {characteristic ? characteristic.name : 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={size.is_active ? "success" : "secondary"}>
                            {size.is_active ? (
                              <><Eye className="w-3 h-3 mr-1" />Active</>
                            ) : (
                              <><EyeOff className="w-3 h-3 mr-1" />Inactive</>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(size.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              
              {sizes.length === 0 && (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No sizes found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProductManagement;