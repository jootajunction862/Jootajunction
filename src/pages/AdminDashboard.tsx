import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, ShoppingCart, Users, Settings, Plus, Edit, Trash2, Eye, Minus, RefreshCw, Tag, Truck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Image as ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { categoriesAPI } from '@/services/api';
import { toast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalRevenue: number;
}

interface RecentOrder {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  totalPrice: number;
  status: string;
  createdAt: string;
}

interface LowStockProduct {
  _id: string;
  name: string;
  sizes: Array<{
    size: number;
    stock: number;
  }>;
}

interface ProductSize {
  size: number;
  stock: number;
}

interface Product {
  _id: string;
  name: string;
  brand: string;
  price: number;
  discountedPrice?: number;
  category: string;
  sizes: ProductSize[];
  images: string[];
  description: string;
  featured?: boolean;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Order {
  _id: string;
  user: {
    name: string;
    email: string;
  };
  totalPrice: number;
  status: string;
  createdAt: string;
  items: any[];
  paymentMethod?: string;
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  shippingPrice?: number;
}

interface ContactEmail {
  email: string;
  label: string;
  isActive: boolean;
}

interface PhoneNumber {
  number: string;
  label: string;
  isActive: boolean;
}

interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  label: string;
  isActive: boolean;
}

interface SocialMedia {
  facebook?: string;
  instagram?: string;
  twitter?: string;
  linkedin?: string;
}

interface BusinessHours {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
}

interface ShippingSettings {
  freeShippingThreshold: number;
  defaultShippingCost: number;
}

interface TaxSettings {
  gstPercentage: number;
  isTaxInclusive: boolean;
}

interface StoreSettings {
  _id: string;
  storeName: string;
  contactEmails: ContactEmail[];
  phoneNumbers: PhoneNumber[];
  addresses: Address[];
  aboutStore: string;
  socialMedia: SocialMedia;
  businessHours: BusinessHours;
  shippingSettings: ShippingSettings;
  taxSettings: TaxSettings;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Brand {
  _id: string;
  name: string;
  description: string;
  logo: string;  // Store the URL string
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface NewBrand {
  name: string;
  description: string;
  logo: string | File;  // Can be either a URL string or a File object
  isActive: boolean;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalProducts: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Indian currency formatter
const formatIndianCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Calculate total stock for a product
const getTotalStock = (sizes: ProductSize[]) => {
  return sizes.reduce((total, size) => total + size.stock, 0);
};

const AdminDashboard: React.FC = () => {
  const { adminUser, adminLogout } = useAdmin();
  const { clearAllAuth } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [newProduct, setNewProduct] = useState<{
    name: string;
    brand: string;
    price: string;
    discountedPrice: string;
    category: string;
    images: FileList | null;
    sizes: string;
    description: string;
  }>(
    {
      name: '',
      brand: '',
      price: '',
      discountedPrice: '',
      category: '',
      images: null,
      sizes: '',
      description: '',
    }
  );
  const [newBrand, setNewBrand] = useState<NewBrand>({
    name: '',
    description: '',
    logo: '',
    isActive: true
  });
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [managingInventory, setManagingInventory] = useState<Product | null>(null);
  const [inventoryUpdates, setInventoryUpdates] = useState<{[key: number]: number}>({});
  const [localInventory, setLocalInventory] = useState<{[key: number]: number}>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showBrandForm, setShowBrandForm] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [allProductsForFeatured, setAllProductsForFeatured] = useState<Product[]>([]);
  const [showFeaturedModal, setShowFeaturedModal] = useState(false);
  const [selectedFeaturedProducts, setSelectedFeaturedProducts] = useState<string[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState({ 
    name: '', 
    description: '', 
    image: '' 
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchDashboardData();
    fetchProducts();
    fetchBrands();
    fetchOrders();
    fetchFeaturedProducts();
    fetchAllProductsForFeatured();
    fetchStoreSettings();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!isSearching) {
      fetchProducts();
    }
  }, [currentPage]);

  // Initialize local inventory when modal opens
  useEffect(() => {
    if (managingInventory) {
      const initialInventory: {[key: number]: number} = {};
      managingInventory.sizes.forEach(size => {
        initialInventory[size.size] = size.stock;
      });
      setLocalInventory(initialInventory);
    }
  }, [managingInventory]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentOrders(data.recentOrders);
        setLowStockProducts(data.lowStockProducts);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async (search = '') => {
    try {
      const token = localStorage.getItem('adminToken');
      
      if (search) {
        // When searching, fetch all products to filter client-side
        console.log('Searching for:', search);
        const url = new URL(`${import.meta.env.VITE_API_URL}/api/admin/products`);
        url.searchParams.append('limit', '1000'); // Get all products for search
        
        console.log('Fetching all products for search with URL:', url.toString());
        
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          const allProductsData = data.products || [];
          console.log('All products fetched:', allProductsData.length);
          
          // Filter products client-side
          const filtered = allProductsData.filter((product: Product) => 
            product.name.toLowerCase().includes(search.toLowerCase())
          );
          
          console.log('Filtered products:', filtered.length);
          console.log('Filtered product names:', filtered.map(p => p.name));
          
          setAllProducts(allProductsData);
          setFilteredProducts(filtered);
          setProducts(filtered);
          setPagination(null); // Hide pagination during search
        }
      } else {
        // Normal paginated fetch
        const url = new URL(`${import.meta.env.VITE_API_URL}/api/admin/products`);
        url.searchParams.append('page', currentPage.toString());
        url.searchParams.append('limit', '10');
        
        console.log('Fetching paginated products with URL:', url.toString());
        
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Paginated products received:', data.products?.length || 0, 'products');
          setProducts(data.products || []);
          setPagination(data.pagination);
        } else {
          console.log('Error response:', response.status, response.statusText);
        }
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchBrands = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        console.error('No admin token found');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/brands`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBrands(data.brands || data); // Handle both paginated and non-paginated responses
      } else {
        const error = await response.json();
        console.error('Error fetching brands:', error.message);
      }
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/orders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchFeaturedProducts = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/featured-products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFeaturedProducts(data);
      }
    } catch (error) {
      console.error('Error fetching featured products:', error);
    }
  };

  const fetchAllProductsForFeatured = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/products-for-featured`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAllProductsForFeatured(data);
      }
    } catch (error) {
      console.error('Error fetching products for featured selection:', error);
    }
  };

  const fetchStoreSettings = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/store-settings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStoreSettings(data);
      }
    } catch (error) {
      console.error('Error fetching store settings:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await categoriesAPI.getAllCategories();
      // Check if data is an array directly
      if (Array.isArray(data)) {
        setCategories(data);
      } else if (data && Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else {
        console.error('Invalid categories data received:', data);
        setCategories([]); // Set empty array as fallback
        toast({
          title: "Error",
          description: "Invalid categories data received",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]); // Set empty array on error
      toast({
        title: "Error",
        description: "Failed to fetch categories",
        variant: "destructive",
      });
    }
  };

  const handleAddProduct = async () => {
    // Validation
    if (!newProduct.name.trim()) {
      toast({
        title: "Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }
    if (!newProduct.brand) {
      toast({
        title: "Error",
        description: "Please select a brand",
        variant: "destructive",
      });
      return;
    }
    if (!newProduct.category) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }
    if (!newProduct.price || parseFloat(newProduct.price) <= 0) {
      toast({
        title: "Error",
        description: "Valid price is required",
        variant: "destructive",
      });
      return;
    }
    if (!newProduct.description.trim()) {
      toast({
        title: "Error",
        description: "Product description is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('brand', newProduct.brand);
      formData.append('price', newProduct.price);
      formData.append('discountedPrice', newProduct.discountedPrice || '');
      formData.append('category', newProduct.category);
      formData.append('description', newProduct.description);
      // Sizes as JSON array
      formData.append('sizes', JSON.stringify(newProduct.sizes.split(',').map(s => s.trim()).filter(Boolean)));
      // Images
      if (newProduct.images && newProduct.images.length > 0) {
        Array.from(newProduct.images).forEach((file) => {
          formData.append('images', file);
        });
      }
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (response.ok) {
        toast({
          title: "Success",
          description: "Product added successfully",
        });
        setNewProduct({
          name: '',
          brand: '',
          price: '',
          discountedPrice: '',
          category: '',
          images: null,
          sizes: '',
          description: '',
        });
        fetchProducts();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to add product",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error adding product:', error);
      toast({
        title: "Error",
        description: "Failed to add product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;
    
    // Validation
    if (!newProduct.name.trim()) {
      toast({
        title: "Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }
    if (!newProduct.brand) {
      toast({
        title: "Error",
        description: "Please select a brand",
        variant: "destructive",
      });
      return;
    }
    if (!newProduct.category) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }
    if (!newProduct.price || parseFloat(newProduct.price) <= 0) {
      toast({
        title: "Error",
        description: "Valid price is required",
        variant: "destructive",
      });
      return;
    }
    if (!newProduct.description.trim()) {
      toast({
        title: "Error",
        description: "Product description is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('brand', newProduct.brand);
      formData.append('price', newProduct.price);
      formData.append('discountedPrice', newProduct.discountedPrice || '');
      formData.append('category', newProduct.category);
      formData.append('description', newProduct.description);
      formData.append('sizes', JSON.stringify(newProduct.sizes.split(',').map(s => s.trim()).filter(Boolean)));
      if (newProduct.images && newProduct.images.length > 0) {
        Array.from(newProduct.images).forEach((file) => {
          formData.append('images', file);
        });
      }
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/products/${editingProduct._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (response.ok) {
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
        setEditingProduct(null);
        setNewProduct({
          name: '',
          brand: '',
          price: '',
          discountedPrice: '',
          category: '',
          images: null,
          sizes: '',
          description: '',
        });
        fetchProducts();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.message || "Failed to update product",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating product:', error);
      toast({
        title: "Error",
        description: "Failed to update product. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setNewProduct({
      name: product.name,
      brand: product.brand,
      price: product.price.toString(),
      discountedPrice: product.discountedPrice?.toString() || '',
      category: product.category,
      images: null, // always reset images on edit
      sizes: product.sizes.map(s => s.size).join(', '),
      description: product.description,
    });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setNewProduct({
      name: '',
      brand: '',
      price: '',
      discountedPrice: '',
      category: '',
      images: null,
      sizes: '',
      description: '',
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchProducts();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleUpdateInventory = async (productId: string, size: number, stock: number) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/products/${productId}/inventory`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ size, stock }),
      });

      if (response.ok) {
        // Update local inventory immediately
        setLocalInventory(prev => ({
          ...prev,
          [size]: stock
        }));
        
        // Refresh both products and dashboard data to update low stock products
        await Promise.all([fetchProducts(), fetchDashboardData()]);
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
    }
  };

  const handleInventoryChange = (size: number, change: number) => {
    if (!managingInventory) return;
    
    const currentStock = localInventory[size] || 0;
    const newStock = Math.max(0, currentStock + change);
    
    // Update local state immediately for UI
    setLocalInventory(prev => ({
      ...prev,
      [size]: newStock
    }));
    
    // Update in database
    handleUpdateInventory(managingInventory._id, size, newStock);
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Refresh both orders and dashboard data to update stats
        await Promise.all([fetchOrders(), fetchDashboardData()]);
      }
    } catch (error) {
      console.error('Error updating order status:', error);
    }
  };

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const handleConfigureSettings = () => {
    // This would typically open a settings modal
    console.log('Configure settings');
  };

  const handleLogout = () => {
    // Clear all tokens and user data from both contexts
    clearAllAuth();
    adminLogout();
    
    // Redirect to homepage
    navigate('/');
  };

  const handleRefreshDashboard = async () => {
    setLoading(true);
    await Promise.all([fetchDashboardData(), fetchProducts(), fetchOrders()]);
    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Brands CRUD Functions
  const handleAddBrand = async () => {
    try {
      if (!newBrand.name.trim()) {
        alert('Brand name is required');
        return;
      }

      const formData = new FormData();
      formData.append('name', newBrand.name.trim());
      formData.append('description', newBrand.description.trim());
      if (typeof newBrand.logo !== 'string') {
        formData.append('logo', newBrand.logo);
      }
      formData.append('isActive', String(newBrand.isActive));

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/brands`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setNewBrand({
          name: '',
          description: '',
          logo: '',
          isActive: true
        });
        setShowBrandModal(false);
        fetchBrands();
      } else {
        const error = await response.json();
        alert(error.message || 'Error adding brand');
      }
    } catch (error) {
      console.error('Error adding brand:', error);
      alert('Error adding brand. Please try again.');
    }
  };

  const handleUpdateBrand = async () => {
    if (!editingBrand) return;
    
    try {
      if (!newBrand.name.trim()) {
        alert('Brand name is required');
        return;
      }

      const formData = new FormData();
      formData.append('name', newBrand.name.trim());
      formData.append('description', newBrand.description.trim());
      if (typeof newBrand.logo !== 'string') {
        formData.append('logo', newBrand.logo);
      }
      formData.append('isActive', String(newBrand.isActive));

      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/brands/${editingBrand._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setEditingBrand(null);
        setNewBrand({
          name: '',
          description: '',
          logo: '',
          isActive: true
        });
        setShowBrandModal(false);
        fetchBrands();
      } else {
        const error = await response.json();
        alert(error.message || 'Error updating brand');
      }
    } catch (error) {
      console.error('Error updating brand:', error);
      alert('Error updating brand. Please try again.');
    }
  };

  const handleEditBrand = (brand: Brand) => {
    setEditingBrand(brand);
    setNewBrand({
      name: brand.name,
      description: brand.description,
      logo: brand.logo || '',
      isActive: brand.isActive
    });
    setShowBrandModal(true);
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('Are you sure you want to delete this brand? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/brands/${brandId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        fetchBrands();
      } else {
        const error = await response.json();
        alert(error.message || 'Error deleting brand');
      }
    } catch (error) {
      console.error('Error deleting brand:', error);
      alert('Error deleting brand. Please try again.');
    }
  };

  // Featured Products Management Functions
  const handleOpenFeaturedModal = () => {
    // Initialize selected products with current featured products
    const currentFeaturedIds = featuredProducts.map(p => p._id);
    setSelectedFeaturedProducts(currentFeaturedIds);
    setShowFeaturedModal(true);
  };

  const handleCloseFeaturedModal = () => {
    setShowFeaturedModal(false);
    setSelectedFeaturedProducts([]);
  };

  const handleToggleProductSelection = (productId: string) => {
    setSelectedFeaturedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSaveFeaturedProducts = async () => {
    try {
      setLoadingFeatured(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/featured-products/bulk`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productIds: selectedFeaturedProducts
        }),
      });

      if (response.ok) {
        const updatedFeaturedProducts = await response.json();
        setFeaturedProducts(updatedFeaturedProducts);
        handleCloseFeaturedModal();
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error updating featured products:', error);
    } finally {
      setLoadingFeatured(false);
    }
  };

  const handleRemoveFromFeatured = async (productId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/products/${productId}/featured`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ featured: false }),
      });

      if (response.ok) {
        fetchFeaturedProducts();
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Error removing from featured:', error);
    }
  };

  // Store Settings Management Functions
  const handleUpdateStoreSettings = async (updatedSettings: Partial<StoreSettings>) => {
    try {
      setLoadingSettings(true);
      setSettingsMessage('');
      
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/store-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedSettings),
      });

      if (response.ok) {
        const data = await response.json();
        setStoreSettings(data);
        setSettingsMessage('Settings updated successfully!');
        setTimeout(() => setSettingsMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setSettingsMessage(errorData.message || 'Error updating settings');
      }
    } catch (error) {
      console.error('Error updating store settings:', error);
      setSettingsMessage('Error updating settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleAddContactEmail = () => {
    if (!storeSettings) return;
    
    const newEmail: ContactEmail = {
      email: '',
      label: 'General',
      isActive: true
    };
    
    setStoreSettings({
      ...storeSettings,
      contactEmails: [...storeSettings.contactEmails, newEmail]
    });
  };

  const handleRemoveContactEmail = (index: number) => {
    if (!storeSettings) return;
    
    const updatedEmails = storeSettings.contactEmails.filter((_, i) => i !== index);
    setStoreSettings({
      ...storeSettings,
      contactEmails: updatedEmails
    });
  };

  const handleUpdateContactEmail = (index: number, field: keyof ContactEmail, value: string | boolean) => {
    if (!storeSettings) return;
    
    const updatedEmails = [...storeSettings.contactEmails];
    updatedEmails[index] = { ...updatedEmails[index], [field]: value };
    
    setStoreSettings({
      ...storeSettings,
      contactEmails: updatedEmails
    });
  };

  const handleAddPhoneNumber = () => {
    if (!storeSettings) return;
    
    const newPhone: PhoneNumber = {
      number: '',
      label: 'General',
      isActive: true
    };
    
    setStoreSettings({
      ...storeSettings,
      phoneNumbers: [...storeSettings.phoneNumbers, newPhone]
    });
  };

  const handleRemovePhoneNumber = (index: number) => {
    if (!storeSettings) return;
    
    const updatedPhones = storeSettings.phoneNumbers.filter((_, i) => i !== index);
    setStoreSettings({
      ...storeSettings,
      phoneNumbers: updatedPhones
    });
  };

  const handleUpdatePhoneNumber = (index: number, field: keyof PhoneNumber, value: string | boolean) => {
    if (!storeSettings) return;
    
    const updatedPhones = [...storeSettings.phoneNumbers];
    updatedPhones[index] = { ...updatedPhones[index], [field]: value };
    
    setStoreSettings({
      ...storeSettings,
      phoneNumbers: updatedPhones
    });
  };

  const handleAddAddress = () => {
    if (!storeSettings) return;
    
    const newAddress: Address = {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'India',
      label: 'Main Office',
      isActive: true
    };
    
    setStoreSettings({
      ...storeSettings,
      addresses: [...storeSettings.addresses, newAddress]
    });
  };

  const handleRemoveAddress = (index: number) => {
    if (!storeSettings) return;
    
    const updatedAddresses = storeSettings.addresses.filter((_, i) => i !== index);
    setStoreSettings({
      ...storeSettings,
      addresses: updatedAddresses
    });
  };

  const handleUpdateAddress = (index: number, field: keyof Address, value: string | boolean) => {
    if (!storeSettings) return;
    
    const updatedAddresses = [...storeSettings.addresses];
    updatedAddresses[index] = { ...updatedAddresses[index], [field]: value };
    
    setStoreSettings({
      ...storeSettings,
      addresses: updatedAddresses
    });
  };

  // Add getBrandLogo function
  const getBrandLogo = (brandName: string) => {
    const logoMap: { [key: string]: string } = {
      'Nike': 'nike.png',
      'Adidas': 'adidas.png',
      'Puma': 'puma.png',
      'Louis Vuitton': 'Louis-Vuitton.png',
      'New Balance': 'new-balance.png',
      'Reebok': 'reebok.png',
      'Under Armour': 'under-armour.png',
      'Asics': 'asics.png',
      'Skechers': 'skechers.png',
      'Brooks': 'brooks.png',
      'Saucony': 'saucony.png',
      'Crocs': 'crocs.png',
     
    };
    return logoMap[brandName] || 'default-logo.png';
  };

  // Category handlers
  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    if (!newCategory.description.trim()) {
      toast({
        title: "Error",
        description: "Category description is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await categoriesAPI.createCategory(newCategory);
      toast({
        title: "Success",
        description: "Category added successfully",
      });
      setShowCategoryModal(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error adding category:', error);
      const errorMessage = error.response?.data?.message || "Failed to add category";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;

    if (!newCategory.name.trim()) {
      toast({
        title: "Error",
        description: "Category name is required",
        variant: "destructive",
      });
      return;
    }

    if (!newCategory.description.trim()) {
      toast({
        title: "Error",
        description: "Category description is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await categoriesAPI.updateCategory(editingCategory._id, newCategory);
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
      setShowCategoryModal(false);
      fetchCategories();
    } catch (error: any) {
      console.error('Error updating category:', error);
      const errorMessage = error.response?.data?.message || "Failed to update category";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      await categoriesAPI.deleteCategory(id);
      // Remove the category from the local state
      setCategories(categories.filter(category => category._id !== id));
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setNewCategory({
      name: category.name,
      description: category.description || '',
      image: category.image || ''
    });
    setShowCategoryModal(true);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      console.log('Search triggered with query:', searchQuery.trim());
      setIsSearching(true);
      setCurrentPage(1);
      fetchProducts(searchQuery.trim());
    }
  };

  const handleClearSearch = () => {
    console.log('Clear search triggered');
    setSearchQuery('');
    setIsSearching(false);
    setCurrentPage(1);
    setFilteredProducts([]);
    fetchProducts(''); // This will fetch paginated products
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const fetchSingleProduct = async (productId: string) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    }
    return null;
  };

  const handleUpdateStockFromOverview = async (product: LowStockProduct) => {
    console.log('Update Stock button clicked for product:', product);
    try {
      const fullProduct = await fetchSingleProduct(product._id);
      console.log('Fetched full product:', fullProduct);
      if (fullProduct) {
        setManagingInventory(fullProduct);
        setLocalInventory({});
        fullProduct.sizes.forEach(size => {
          setLocalInventory(prev => ({
            ...prev,
            [size.size]: size.stock
          }));
        });
        console.log('Stock update modal should be open now');
      } else {
        // Fallback: try to find in products array
        console.log('Trying fallback - searching in products array');
        const productToEdit = products.find(p => p._id === product._id);
        console.log('Found product in array:', productToEdit);
        if (productToEdit) {
          setManagingInventory(productToEdit);
          setLocalInventory({});
          productToEdit.sizes.forEach(size => {
            setLocalInventory(prev => ({
              ...prev,
              [size.size]: size.stock
            }));
          });
          console.log('Stock update modal should be open now (fallback)');
        } else {
          console.log('Product not found in either location');
        }
      }
    } catch (error) {
      console.error('Error updating stock:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center">
              <img
                src="/logo.png"
                alt="Joota Junction"
                className="h-32 w-auto"
              />
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshDashboard}
                disabled={loading}
                className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9"
              >
                <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleLogout} 
                className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-8 sm:h-9"
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-4 sm:mb-6 bg-white shadow-sm h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 sm:py-3 px-1 sm:px-3">Overview</TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm py-2 sm:py-3 px-1 sm:px-3">Products</TabsTrigger>
            <TabsTrigger value="brands" className="text-xs sm:text-sm py-2 sm:py-3 px-1 sm:px-3">Brands</TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm py-2 sm:py-3 px-1 sm:px-3">Categories</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm py-2 sm:py-3 px-1 sm:px-3">Orders</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm py-2 sm:py-3 px-1 sm:px-3">Settings</TabsTrigger>
          </TabsList>

          {lastUpdated && (
            <div className="text-xs text-gray-500 mb-3 sm:mb-4 text-center">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-blue-800">Total Products</CardTitle>
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-900">{stats?.totalProducts || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-green-800">Total Orders</CardTitle>
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-900">{stats?.totalOrders || 0}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-purple-800">Revenue</CardTitle>
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-900">{formatIndianCurrency(stats?.totalRevenue || 0)}</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-orange-800">Pending Orders</CardTitle>
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-900">{stats?.pendingOrders || 0}</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-800 text-white rounded-t-lg px-4 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Customer</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Total</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Status</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order._id} className="hover:bg-gray-50">
                          <TableCell className="px-2 sm:px-6">
                            <div>
                              <div className="font-medium text-xs sm:text-sm">{order.user && order.user.name ? order.user.name : 'Unknown'}</div>
                              <div className="text-xs text-gray-600 hidden sm:block">{order.user && order.user.email ? order.user.email : 'Unknown'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600 text-xs sm:text-sm px-2 sm:px-6">{formatIndianCurrency(order.totalPrice)}</TableCell>
                          <TableCell className="px-2 sm:px-6">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Products */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-t-lg px-4 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Low Stock Products</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Product</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">Low Stock Sizes</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lowStockProducts.map((product) => (
                        <TableRow key={product._id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-6">{product.name}</TableCell>
                          <TableCell className="px-2 sm:px-6 hidden sm:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {product.sizes.filter(s => s.stock < 10).map((size) => (
                                <span key={size.size} className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Size {size.size}: {size.stock}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="px-2 sm:px-6">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleUpdateStockFromOverview(product)}
                              className="text-xs px-2 py-1 h-7 sm:h-8 text-blue-600 hover:text-blue-700"
                            >
                              <Package className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Update Stock</span>
                              <span className="sm:hidden">Update</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Featured Products Management */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-t-lg px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">Featured Products</CardTitle>
                  <Button 
                    onClick={handleOpenFeaturedModal}
                    className="bg-white text-orange-600 hover:bg-gray-100 text-xs sm:text-sm px-3 sm:px-4 py-2 h-8 sm:h-9"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Manage Featured</span>
                    <span className="sm:hidden">Manage</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Image</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Product</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Price</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">Category</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {featuredProducts.length > 0 ? (
                        featuredProducts.map((product) => (
                          <TableRow key={product._id} className="hover:bg-gray-50">
                            <TableCell className="px-2 sm:px-6">
                              <img 
                                src={product.images[0] ? (product.images[0].startsWith('/uploads/products') ? `${import.meta.env.VITE_API_URL}${product.images[0]}` : product.images[0]) : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMjAgMTVDMjIuNzYxNCAxNSAyNSAxNy4yMzg2IDI1IDIwQzI1IDIyLjc2MTQgMjIuNzYxNCAyNSAyMCAyNUMxNy4yMzg2IDI1IDE1IDIyLjc2MTQgMTUgMjBDMTUgMTcuMjM4NiAxNy4yMzg2IDE1IDIwIDE1WiIgZmlsbD0iIzk0OTY5RiIvPjxwYXRoIGQ9Ik0yMCAyN0MyMy4zMTM3IDI3IDI2IDI0LjMxMzcgMjYgMjFIMTRDMTQgMjQuMzEzNyAxNi42ODYzIDI3IDIwIDI3WiIgZmlsbD0iIzk0OTY5RiIvPjwvc3ZnPg=='} 
                                alt={product.name} 
                                className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-md"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMjAgMTVDMjIuNzYxNCAxNSAyNSAxNy4yMzg2IDI1IDIwQzI1IDIyLjc2MTQgMjIuNzYxNCAyNSAyMCAyNUMxNy4yMzg2IDI1IDE1IDIyLjc2MTQgMTUgMjBDMTUgMTcuMjM4NiAxNy4yMzg2IDE1IDIwIDE1WiIgZmlsbD0iIzk0OTY5RiIvPjxwYXRoIGQ9Ik0yMCAyN0MyMy4zMTM3IDI3IDI2IDI0LjMxMzcgMjYgMjFIMTRDMTQgMjQuMzEzNyAxNi42ODYzIDI3IDIwIDI3WiIgZmlsbD0iIzk0OTY5RiIvPjwvc3ZnPg==';
                                }}
                              />
                            </TableCell>
                            <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-6">
                              <div>
                                <div className="font-medium">{product.name}</div>
                                <div className="text-xs text-gray-600 hidden sm:block">{product.brand}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-green-600 text-xs sm:text-sm px-2 sm:px-6">
                              {formatIndianCurrency(product.price)}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">
                              {product.category}
                            </TableCell>
                            <TableCell className="px-2 sm:px-6">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleRemoveFromFeatured(product._id)}
                                className="text-xs px-2 py-1 h-7 sm:h-8 text-red-600 hover:text-red-700"
                              >
                                <Minus className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Remove</span>
                                <span className="sm:hidden">Remove</span>
                        </Button>
                            </TableCell>
                          </TableRow>
                        ))
                    ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No featured products selected. Click "Manage Featured" to add products.
                          </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-4 sm:space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">Products Management</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center">
                    <div className="flex gap-2 items-center">
                      <Input
                        type="text"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleSearchKeyPress}
                        style={{ color: 'black', backgroundColor: 'white' }}
                        className="w-36 sm:w-48 text-black bg-white border-gray-300"
                      />
                      <Button 
                        onClick={handleSearch} 
                        className="bg-white text-blue-600 hover:bg-gray-100 text-xs sm:text-sm px-3 py-2 h-8 sm:h-9"
                      >
                        Search
                      </Button>
                      {isSearching && (
                        <Button 
                          onClick={handleClearSearch} 
                          className="bg-white text-gray-600 hover:bg-gray-100 text-xs sm:text-sm px-2 py-2 h-8 sm:h-9"
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                    <Button 
                      onClick={() => {
                        setEditingProduct(null);
                        setNewProduct({ name: '', brand: '', price: '', discountedPrice: '', category: '', images: null, sizes: '', description: '' });
                        setShowProductModal(true);
                      }}
                      className="bg-white text-blue-600 hover:bg-gray-100 text-xs sm:text-sm px-3 sm:px-4 py-2 h-8 sm:h-9"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      <span className="hidden sm:inline">Add Product</span>
                      <span className="sm:hidden">Add</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isSearching && (
                  <div className="bg-blue-50 border-b border-blue-200 px-4 py-3">
                    <p className="text-sm text-blue-800">
                      Search results for "{searchQuery}" - {products.length} product{products.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Image</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Price</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">Category</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product._id} className="hover:bg-gray-50">
                          <TableCell className="px-2 sm:px-6">
                            <img 
                              src={product.images[0] ? (product.images[0].startsWith('/uploads/products') ? `${import.meta.env.VITE_API_URL}${product.images[0]}` : product.images[0]) : 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMjAgMTVDMjIuNzYxNCAxNSAyNSAxNy4yMzg2IDI1IDIwQzI1IDIyLjc2MTQgMjIuNzYxNCAyNSAyMCAyNUMxNy4yMzg2IDI1IDE1IDIyLjc2MTQgMTUgMjBDMTUgMTcuMjM4NiAxNy4yMzg2IDE1IDIwIDE1WiIgZmlsbD0iIzk0OTY5RiIvPjxwYXRoIGQ9Ik0yMCAyN0MyMy4zMTM3IDI3IDI2IDI0LjMxMzcgMjYgMjFIMTRDMTQgMjQuMzEzNyAxNi42ODYzIDI3IDIwIDI3WiIgZmlsbD0iIzk0OTY5RiIvPjwvc3ZnPg=='} 
                              alt={product.name} 
                              className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-md"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIGZpbGw9IiNFNUU3RUIiLz48cGF0aCBkPSJNMjAgMTVDMjIuNzYxNCAxNSAyNSAxNy4yMzg2IDI1IDIwQzI1IDIyLjc2MTQgMjIuNzYxNCAyNSAyMCAyNUMxNy4yMzg2IDI1IDE1IDIyLjc2MTQgMTUgMjBDMTUgMTcuMjM4NiAxNy4yMzg2IDE1IDIwIDE1WiIgZmlsbD0iIzk0OTY5RiIvPjxwYXRoIGQ9Ik0yMCAyN0MyMy4zMTM3IDI3IDI2IDI0LjMxMzcgMjYgMjFIMTRDMTQgMjQuMzEzNyAxNi42ODYzIDI3IDIwIDI3WiIgZmlsbD0iIzk0OTY5RiIvPjwvc3ZnPg==';
                              }}
                            />
                          </TableCell>
                          <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-6">
                            <div>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-gray-600 hidden sm:block">{product.description}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600 text-xs sm:text-sm px-2 sm:px-6">{formatIndianCurrency(product.price)}</TableCell>
                          <TableCell className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">{product.category}</TableCell>
                          <TableCell className="px-2 sm:px-6">
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  handleEditProduct(product);
                                  setShowProductModal(true);
                                }}
                                className="text-xs px-2 py-1 h-7 sm:h-8"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setManagingInventory(product);
                                  setLocalInventory({});
                                  product.sizes.forEach(size => {
                                    setLocalInventory(prev => ({
                                      ...prev,
                                      [size.size]: size.stock
                                    }));
                                  });
                                }}
                                className="text-xs px-2 py-1 h-7 sm:h-8 text-blue-600 hover:text-blue-700"
                              >
                                <Package className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Stock</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDeleteProduct(product._id)}
                                className="text-xs px-2 py-1 h-7 sm:h-8 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Delete</span>
                                  </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {pagination && !isSearching && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
                      <div className="flex-1 flex justify-between sm:hidden">
                        <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                          disabled={!pagination.hasPrev}
                          className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                          disabled={!pagination.hasNext}
                          className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>
                      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm text-gray-700">
                            Showing page <span className="font-medium">{pagination.currentPage}</span> of{' '}
                            <span className="font-medium">{pagination.totalPages}</span>
                          </p>
                        </div>
                        <div>
                          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                            <button
                              onClick={() => setCurrentPage(currentPage - 1)}
                              disabled={!pagination.hasPrev}
                              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Previous
                            </button>
                            <button
                              onClick={() => setCurrentPage(currentPage + 1)}
                              disabled={!pagination.hasNext}
                              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Next
                            </button>
                          </nav>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Brands Tab */}
          <TabsContent value="brands" className="space-y-4 sm:space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-t-lg px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">Brands Management</CardTitle>
                  <Button 
                    onClick={() => {
                      setEditingBrand(null);
                      setNewBrand({ name: '', description: '', logo: '', isActive: true });
                      setShowBrandModal(true);
                    }}
                    className="bg-white text-green-600 hover:bg-gray-100 text-xs sm:text-sm px-3 sm:px-4 py-2 h-8 sm:h-9"
                  >
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Add Brand</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">Description</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {brands.map((brand) => (
                        <TableRow key={brand._id} className="hover:bg-gray-50">
                          <TableCell className="px-2 sm:px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 relative">
                                <img
                                  src={brand.logo || 'https://via.placeholder.com/150'}
                                  alt={brand.name}
                                  className="w-full h-full object-contain rounded-lg"
                                  onError={(e) => {
                                    e.currentTarget.src = 'https://via.placeholder.com/150';
                                  }}
                                />
                              </div>
                              <div>
                                <h3 className="font-medium text-gray-900">{brand.name}</h3>
                                <p className="text-sm text-gray-500">{brand.description}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-2 sm:px-6">{brand.description}</TableCell>
                          <TableCell className="px-2 sm:px-6">
                            <Badge variant={brand.isActive ? "default" : "secondary"}>
                              {brand.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2 sm:px-6">
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEditBrand(brand)}
                                className="text-xs px-2 py-1 h-7 sm:h-8"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDeleteBrand(brand._id)}
                                className="text-xs px-2 py-1 h-7 sm:h-8 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
                <Button 
                  onClick={() => {
                    setEditingCategory(null);
                    setNewCategory({ name: '', description: '', image: '' });
                    setShowCategoryModal(true);
                  }}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">Description</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(categories) && categories.map((category) => (
                        <TableRow key={category._id} className="hover:bg-gray-50">
                          <TableCell className="font-medium text-xs sm:text-sm px-2 sm:px-6">{category.name}</TableCell>
                          <TableCell className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">{category.description}</TableCell>
                          <TableCell className="px-2 sm:px-6">
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleEditCategory(category)}
                                className="text-xs px-2 py-1 h-7 sm:h-8"
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleDeleteCategory(category._id)}
                                className="text-xs px-2 py-1 h-7 sm:h-8 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4 sm:space-y-6">
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg px-4 sm:px-6 py-3 sm:py-4">
                <CardTitle className="text-base sm:text-lg lg:text-xl">Orders Management</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Order ID</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Customer</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Total</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Status</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">Date</TableHead>
                        <TableHead className="text-xs sm:text-sm px-2 sm:px-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order._id} className="hover:bg-gray-50">
                          <TableCell className="font-mono text-xs sm:text-sm px-2 sm:px-6">#{order._id.slice(-6)}</TableCell>
                          <TableCell className="px-2 sm:px-6">
                            <div>
                              <div className="font-medium text-xs sm:text-sm">{order.user && order.user.name ? order.user.name : 'Unknown'}</div>
                              <div className="text-xs text-gray-600 hidden sm:block">{order.user && order.user.email ? order.user.email : 'Unknown'}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-green-600 text-xs sm:text-sm px-2 sm:px-6">{formatIndianCurrency(order.totalPrice)}</TableCell>
                          <TableCell className="px-2 sm:px-6">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                              {order.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm px-2 sm:px-6 hidden sm:table-cell">{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="px-2 sm:px-6">
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleViewOrderDetails(order)}
                                className="text-xs px-2 py-1 h-7 sm:h-8"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleUpdateOrderStatus(order._id, order.status === 'pending' ? 'shipped' : 'delivered')}
                                className="text-xs px-2 py-1 h-7 sm:h-8"
                              >
                                <Truck className="h-3 w-3 mr-1" />
                                <span className="hidden sm:inline">Update</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-4 sm:space-y-6">
            {/* Store Settings */}
            <Card className="shadow-lg border-0">
              <CardHeader className="bg-gradient-to-r from-gray-700 to-gray-900 text-white rounded-t-lg px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <CardTitle className="text-base sm:text-lg lg:text-xl">Store Settings</CardTitle>
                  <Button 
                    onClick={() => handleUpdateStoreSettings(storeSettings!)}
                    disabled={loadingSettings || !storeSettings}
                    className="bg-white text-gray-700 hover:bg-gray-100 text-xs sm:text-sm px-3 sm:px-4 py-2 h-8 sm:h-9"
                  >
                    {loadingSettings ? (
                      <>
                        <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 animate-spin" />
                        <span className="hidden sm:inline">Saving...</span>
                        <span className="sm:hidden">Save</span>
                      </>
                    ) : (
                      <>
                        <Settings className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="hidden sm:inline">Save Settings</span>
                        <span className="sm:hidden">Save</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {settingsMessage && (
                  <div className={`mb-4 p-3 rounded-md text-sm ${
                    settingsMessage.includes('successfully') 
                      ? 'bg-green-100 text-green-700 border border-green-200' 
                      : 'bg-red-100 text-red-700 border border-red-200'
                  }`}>
                    {settingsMessage}
                  </div>
                )}

                {storeSettings ? (
                  <div className="space-y-6">
                    {/* Contact Emails */}
                  <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900">Contact Emails</h3>
                        <Button 
                          onClick={handleAddContactEmail}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Email
                        </Button>
                  </div>
                      <div className="space-y-3">
                        {storeSettings.contactEmails.map((email, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <Input
                                placeholder="Email"
                                value={email.email}
                                onChange={(e) => handleUpdateContactEmail(index, 'email', e.target.value)}
                                type="email"
                                className="text-xs sm:text-sm"
                              />
                              <Input
                                placeholder="Label (e.g., General, Support)"
                                value={email.label}
                                onChange={(e) => handleUpdateContactEmail(index, 'label', e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={email.isActive}
                                  onChange={(e) => handleUpdateContactEmail(index, 'isActive', e.target.checked)}
                                  className="mr-2"
                                />
                                <label className="text-xs sm:text-sm text-gray-600">Active</label>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleRemoveContactEmail(index)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 text-xs"
                            >
                              <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                        ))}
                      </div>
                    </div>

                    {/* Phone Numbers */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900">Phone Numbers</h3>
                        <Button 
                          onClick={handleAddPhoneNumber}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Phone
                        </Button>
                      </div>
                      <div className="space-y-3">
                        {storeSettings.phoneNumbers.map((phone, index) => (
                          <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <Input
                                placeholder="Phone Number"
                                value={phone.number}
                                onChange={(e) => handleUpdatePhoneNumber(index, 'number', e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <Input
                                placeholder="Label (e.g., General, Support)"
                                value={phone.label}
                                onChange={(e) => handleUpdatePhoneNumber(index, 'label', e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={phone.isActive}
                                  onChange={(e) => handleUpdatePhoneNumber(index, 'isActive', e.target.checked)}
                                  className="mr-2"
                                />
                                <label className="text-xs sm:text-sm text-gray-600">Active</label>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleRemovePhoneNumber(index)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 text-xs"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Addresses */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-base sm:text-lg font-medium text-gray-900">Addresses</h3>
                        <Button 
                          onClick={handleAddAddress}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Add Address
                        </Button>
                      </div>
                      <div className="space-y-4">
                        {storeSettings.addresses.map((address, index) => (
                          <div key={index} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <Input
                                placeholder="Label (e.g., Main Office, Warehouse)"
                                value={address.label}
                                onChange={(e) => handleUpdateAddress(index, 'label', e.target.value)}
                                className="w-48 text-xs sm:text-sm"
                              />
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={address.isActive}
                                  onChange={(e) => handleUpdateAddress(index, 'isActive', e.target.checked)}
                                  className="mr-1"
                                />
                                <label className="text-xs sm:text-sm text-gray-600">Active</label>
                                <Button
                                  onClick={() => handleRemoveAddress(index)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 text-xs"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              <Input
                                placeholder="Street Address"
                                value={address.street}
                                onChange={(e) => handleUpdateAddress(index, 'street', e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <Input
                                placeholder="City"
                                value={address.city}
                                onChange={(e) => handleUpdateAddress(index, 'city', e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <Input
                                placeholder="State"
                                value={address.state}
                                onChange={(e) => handleUpdateAddress(index, 'state', e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <Input
                                placeholder="ZIP Code"
                                value={address.zipCode}
                                onChange={(e) => handleUpdateAddress(index, 'zipCode', e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                              <Input
                                placeholder="Country"
                                value={address.country}
                                onChange={(e) => handleUpdateAddress(index, 'country', e.target.value)}
                                className="text-xs sm:text-sm"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* About Store */}
                    <div>
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3">About Store</h3>
                      <textarea 
                        value={storeSettings.aboutStore}
                        onChange={(e) => setStoreSettings({...storeSettings, aboutStore: e.target.value})}
                        rows={4}
                        placeholder="Describe your store..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-xs sm:text-sm"
                      />
                    </div>

                    {/* Social Media */}
                    <div>
                      <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-3">Social Media Links</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs sm:text-sm font-medium text-gray-700">Facebook URL</label>
                          <Input 
                            value={storeSettings.socialMedia?.facebook || ''}
                            onChange={(e) => setStoreSettings({
                              ...storeSettings, 
                              socialMedia: {
                                ...storeSettings.socialMedia,
                                facebook: e.target.value
                              }
                            })}
                            placeholder="https://facebook.com/yourpage"
                            className="border-gray-300 focus:border-blue-500 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs sm:text-sm font-medium text-gray-700">Instagram URL</label>
                          <Input 
                            value={storeSettings.socialMedia?.instagram || ''}
                            onChange={(e) => setStoreSettings({
                              ...storeSettings, 
                              socialMedia: {
                                ...storeSettings.socialMedia,
                                instagram: e.target.value
                              }
                            })}
                            placeholder="https://instagram.com/yourpage"
                            className="border-gray-300 focus:border-blue-500 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs sm:text-sm font-medium text-gray-700">Twitter URL</label>
                          <Input 
                            value={storeSettings.socialMedia?.twitter || ''}
                            onChange={(e) => setStoreSettings({
                              ...storeSettings, 
                              socialMedia: {
                                ...storeSettings.socialMedia,
                                twitter: e.target.value
                              }
                            })}
                            placeholder="https://twitter.com/yourpage"
                            className="border-gray-300 focus:border-blue-500 text-xs sm:text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs sm:text-sm font-medium text-gray-700">LinkedIn URL</label>
                          <Input 
                            value={storeSettings.socialMedia?.linkedin || ''}
                            onChange={(e) => setStoreSettings({
                              ...storeSettings, 
                              socialMedia: {
                                ...storeSettings.socialMedia,
                                linkedin: e.target.value
                              }
                            })}
                            placeholder="https://linkedin.com/company/yourcompany"
                            className="border-gray-300 focus:border-blue-500 text-xs sm:text-sm"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Leave fields empty to hide social media links from the website
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading settings...</span>
                  </div>
                )}
              </CardContent>
            </Card>

          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Modal */}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Order Details - #{selectedOrder._id.slice(-8)}
              </h2>
              <button
                onClick={() => setShowOrderModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm"><span className="font-medium">Name:</span> {selectedOrder.user.name}</p>
                  <p className="text-sm"><span className="font-medium">Email:</span> {selectedOrder.user.email}</p>
                </div>
              </div>

              {/* Order Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Order Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm"><span className="font-medium">Order Date:</span> {new Date(selectedOrder.createdAt).toLocaleDateString()}</p>
                  <p className="text-sm"><span className="font-medium">Payment Method:</span> {selectedOrder.paymentMethod?.replace('_', ' ').toUpperCase() || 'Credit Card'}</p>
                  <p className="text-sm">
                    <span className="font-medium">Status:</span> 
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Order Items */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex items-center space-x-4 bg-gray-50 p-4 rounded-lg">
                        {item.product?.images && item.product.images[0] && (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.product?.name || 'Product Name'}</h4>
                          <p className="text-sm text-gray-600">Size: {item.size} | Qty: {item.quantity}</p>
                          <p className="text-sm font-medium text-gray-900">{formatIndianCurrency(item.price)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Shipping Address</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm">{selectedOrder.shippingAddress.street}</p>
                    <p className="text-sm">{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                    <p className="text-sm">{selectedOrder.shippingAddress.country}</p>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Order Summary</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Subtotal:</span>
                    <span className="text-sm font-medium">{formatIndianCurrency(selectedOrder.totalPrice - (selectedOrder.shippingPrice || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Shipping:</span>
                    <span className="text-sm font-medium">{formatIndianCurrency(selectedOrder.shippingPrice || 0)}</span>
                  </div>
                  <div className="border-t border-gray-300 pt-2 flex justify-between">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-lg">{formatIndianCurrency(selectedOrder.totalPrice)}</span>
                  </div>
                </div>
              </div>

              {/* Update Status */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Update Order Status</h3>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => {
                    handleUpdateOrderStatus(selectedOrder._id, e.target.value);
                    setSelectedOrder({ ...selectedOrder, status: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowOrderModal(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      <Dialog open={showProductModal} onOpenChange={setShowProductModal}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
            <DialogDescription>
              {editingProduct ? 'Update product details below.' : 'Fill in the details to add a new product.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Product Name"
              value={newProduct.name}
              onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
            />
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Select
                value={newProduct.brand}
                onValueChange={(value) => setNewProduct({...newProduct, brand: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand._id} value={brand.name}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Original Price (₹)"
              type="number"
              value={newProduct.price}
              onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
            />
            <Input
              placeholder="Discounted Price (₹) - Optional"
              type="number"
              value={newProduct.discountedPrice}
              onChange={(e) => setNewProduct({...newProduct, discountedPrice: e.target.value})}
            />
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={newProduct.category}
                onValueChange={(value) => setNewProduct({...newProduct, category: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category._id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={e => setNewProduct({ ...newProduct, images: e.target.files })}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
            />
            <Input
              placeholder="Sizes (comma separated)"
              value={newProduct.sizes}
              onChange={(e) => setNewProduct({...newProduct, sizes: e.target.value})}
            />
            <Input
              placeholder="Description"
              value={newProduct.description}
              onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
            />
          </div>
          <DialogFooter className="mt-4">
            {editingProduct ? (
              <Button onClick={async () => { await handleUpdateProduct(); setShowProductModal(false); }} className="bg-blue-600 hover:bg-blue-700">
                <Edit className="h-4 w-4 mr-2" /> Update Product
              </Button>
            ) : (
              <Button onClick={async () => { await handleAddProduct(); setShowProductModal(false); }} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" /> Add Product
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Brand Modal */}
      <Dialog open={showBrandModal} onOpenChange={setShowBrandModal}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>{editingBrand ? 'Edit Brand' : 'Add New Brand'}</DialogTitle>
            <DialogDescription>
              {editingBrand ? 'Update brand details below.' : 'Fill in the details to add a new brand.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Brand Name *</Label>
              <Input
                id="name"
                placeholder="Enter brand name"
                value={newBrand.name}
                onChange={(e) => setNewBrand({...newBrand, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Enter brand description"
                value={newBrand.description}
                onChange={(e) => setNewBrand({...newBrand, description: e.target.value})}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo">Brand Logo *</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewBrand({...newBrand, logo: file});
                    }
                  }}
                  className="cursor-pointer"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={newBrand.isActive}
                onChange={(e) => setNewBrand({...newBrand, isActive: e.target.checked})}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive" className="text-sm">Active</Label>
            </div>
          </div>
          <DialogFooter className="mt-4">
            {editingBrand ? (
              <Button onClick={handleUpdateBrand} className="bg-green-600 hover:bg-green-700">
                <Edit className="h-4 w-4 mr-2" /> Update Brand
              </Button>
            ) : (
              <Button onClick={handleAddBrand} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" /> Add Brand
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Featured Products Modal */}
      <Dialog open={showFeaturedModal} onOpenChange={setShowFeaturedModal}>
        <DialogContent className="max-w-4xl w-full max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Featured Products</DialogTitle>
            <DialogDescription>
              Select products to feature on the homepage. Only the first 3 selected products will be displayed.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Selected: {selectedFeaturedProducts.length} products
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedFeaturedProducts([])}
                  className="text-xs"
                >
                  Clear All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentFeaturedIds = featuredProducts.map(p => p._id);
                    setSelectedFeaturedProducts(currentFeaturedIds);
                  }}
                  className="text-xs"
                >
                  Select Current
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {allProductsForFeatured.map((product) => (
                <div
                  key={product._id}
                  className={`border rounded-lg p-3 cursor-pointer transition-all ${
                    selectedFeaturedProducts.includes(product._id)
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleToggleProductSelection(product._id)}
                >
                  <div className="flex items-start space-x-3">
                    <img
                      src={product.images[0] || 'https://via.placeholder.com/60'}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-gray-900 truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs text-gray-600 truncate">{product.brand}</p>
                      <p className="text-sm font-semibold text-green-600">
                        {formatIndianCurrency(product.price)}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{product.category}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {selectedFeaturedProducts.includes(product._id) ? (
                        <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              onClick={handleSaveFeaturedProducts}
              disabled={loadingFeatured}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loadingFeatured ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Save Featured Products
                </>
              )}
            </Button>
            <DialogClose asChild>
              <Button variant="outline" onClick={handleCloseFeaturedModal}>
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inventory Management Modal */}
      <Dialog open={!!managingInventory} onOpenChange={() => setManagingInventory(null)}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto p-3 sm:p-6 mx-2 sm:mx-auto">
          <DialogHeader className="pb-3 sm:pb-4">
            <DialogTitle className="text-base sm:text-xl">Manage Inventory</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Update stock levels for {managingInventory?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4">
            {managingInventory && (
              <div className="space-y-3 sm:space-y-4">
                {/* Product Info Card */}
                <div className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <img
                    src={managingInventory.images[0] || 'https://via.placeholder.com/60'}
                    alt={managingInventory.name}
                    className="w-10 h-10 sm:w-16 sm:h-16 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-xs sm:text-base text-gray-900 truncate">
                      {managingInventory.name}
                    </h4>
                    <p className="text-xs text-gray-600 truncate">{managingInventory.brand}</p>
                    <p className="text-xs sm:text-base font-semibold text-green-600">
                      {formatIndianCurrency(managingInventory.price)}
                    </p>
                  </div>
                </div>

                {/* Size & Stock Management */}
                <div className="space-y-2 sm:space-y-3">
                  <h5 className="font-medium text-sm sm:text-base text-gray-900">Size & Stock Management</h5>
                  <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto">
                    {managingInventory.sizes.map((size) => (
                      <div key={size.size} className="flex items-center justify-between p-2 sm:p-3 border border-gray-200 rounded-lg bg-white">
                        <div className="flex items-center space-x-1 sm:space-x-3 min-w-0 flex-1">
                          <span className="font-medium text-xs sm:text-base whitespace-nowrap">Size {size.size}</span>
                          <span className="text-xs text-gray-600 truncate">
                            Current: {localInventory[size.size] || 0}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInventoryChange(size.size, -1)}
                            disabled={!localInventory[size.size] || localInventory[size.size] <= 0}
                            className="w-6 h-6 sm:w-8 sm:h-8 p-0"
                          >
                            <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <span className="w-8 sm:w-12 text-center text-xs sm:text-base font-medium">
                            {localInventory[size.size] || 0}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleInventoryChange(size.size, 1)}
                            className="w-6 h-6 sm:w-8 sm:h-8 p-0"
                          >
                            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Stock Summary */}
                <div className="pt-2 sm:pt-3 border-t border-gray-200 bg-gray-50 p-2 sm:p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-base font-medium text-gray-900">Total Stock:</span>
                    <span className="text-xs sm:text-base font-semibold text-blue-600">
                      {Object.values(localInventory).reduce((sum, stock) => sum + (stock || 0), 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
            <DialogClose asChild>
              <Button variant="outline" className="w-full sm:w-auto">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update category details below.' : 'Fill in the details to add a new category.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                placeholder="Enter category name"
                value={newCategory.name}
                onChange={(e) => setNewCategory({...newCategory, name: e.target.value})}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                placeholder="Enter category description"
                value={newCategory.description}
                onChange={(e) => setNewCategory({...newCategory, description: e.target.value})}
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Category Image (Optional)</Label>
              <Input
                id="image"
                type="text"
                placeholder="Enter image URL (optional)"
                value={newCategory.image}
                onChange={(e) => setNewCategory({...newCategory, image: e.target.value})}
              />
              {newCategory.image && (
                <div className="mt-2">
                  <img 
                    src={newCategory.image} 
                    alt="Category preview" 
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="mt-4">
            {editingCategory ? (
              <Button onClick={handleUpdateCategory} className="bg-purple-600 hover:bg-purple-700">
                <Edit className="h-4 w-4 mr-2" /> Update Category
              </Button>
            ) : (
              <Button onClick={handleAddCategory} className="bg-purple-600 hover:bg-purple-700">
                <Plus className="h-4 w-4 mr-2" /> Add Category
              </Button>
            )}
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard; 
