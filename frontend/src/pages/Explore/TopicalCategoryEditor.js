import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, Save, Eye, Loader2, Palette, FolderTree, Hash
} from 'lucide-react';
import { useExploreContent, useExploreContentList, useCreateExploreContent, useUpdateExploreContent } from '../../hooks/useExplore';
import { useToast } from '../../hooks/use-toast';

// Available icons for categories
const AVAILABLE_ICONS = [
  { value: 'heart', label: 'Heart' },
  { value: 'book-open', label: 'Book Open' },
  { value: 'cross', label: 'Cross' },
  { value: 'star', label: 'Star' },
  { value: 'shield', label: 'Shield' },
  { value: 'sun', label: 'Sun' },
  { value: 'moon', label: 'Moon' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'flame', label: 'Flame' },
  { value: 'crown', label: 'Crown' },
  { value: 'dove', label: 'Dove' },
  { value: 'lamp', label: 'Lamp' },
  { value: 'mountain', label: 'Mountain' },
  { value: 'water', label: 'Water' },
  { value: 'tree', label: 'Tree' },
  { value: 'hand-praying', label: 'Praying Hands' },
  { value: 'lightbulb', label: 'Lightbulb' },
  { value: 'compass', label: 'Compass' },
  { value: 'anchor', label: 'Anchor' },
  { value: 'users', label: 'Community' },
];

// Predefined colors
const PRESET_COLORS = [
  { value: '#3B82F6', label: 'Blue' },
  { value: '#10B981', label: 'Green' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EF4444', label: 'Red' },
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#F97316', label: 'Orange' },
  { value: '#84CC16', label: 'Lime' },
  { value: '#6366F1', label: 'Indigo' },
];

export default function TopicalCategoryEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isEditMode = id && id !== 'new';

  // Form state
  const [formData, setFormData] = useState({
    name: { en: '', id: '' },
    description: { en: '', id: '' },
    icon: 'heart',
    color: '#3B82F6',
    parent_category_id: null,
    sort_order: 0,
    status: 'published',
  });

  const [activeLanguage, setActiveLanguage] = useState('en');

  // Fetch all categories for parent selection (with multi-tenant cache isolation)
  const { data: categoriesData } = useExploreContentList('topical_category', { limit: 100 });
  const categories = categoriesData?.items || categoriesData || [];

  // Fetch existing category if editing (with multi-tenant cache isolation)
  const { data: category, isLoading } = useExploreContent('topical_category', isEditMode ? id : null);

  // Create and update mutations with multi-tenant cache isolation
  const createMutation = useCreateExploreContent('topical_category');
  const updateMutation = useUpdateExploreContent('topical_category');
  const saveMutation = isEditMode ? updateMutation : createMutation;

  // Populate form when data loads
  useEffect(() => {
    if (category && isEditMode) {
      setFormData({
        name: category.name || { en: '', id: '' },
        description: category.description || { en: '', id: '' },
        icon: category.icon || 'heart',
        color: category.color || '#3B82F6',
        parent_category_id: category.parent_category_id || null,
        sort_order: category.sort_order || 0,
        status: category.status || 'published',
      });
    }
  }, [category, isEditMode]);

  const handleInputChange = (field, value, language = null) => {
    if (language) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [language]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.en.trim()) {
      toast({
        title: 'Validation Error',
        description: 'English category name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.description.en.trim()) {
      toast({
        title: 'Validation Error',
        description: 'English description is required',
        variant: 'destructive',
      });
      return;
    }

    if (isEditMode) {
      updateMutation.mutate({ contentId: id, data: formData }, {
        onSuccess: () => navigate('/content-center/topical')
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => navigate('/content-center/topical')
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // Filter out current category from parent options (can't be its own parent)
  const parentOptions = categories.filter(cat => cat.id !== id);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/content-center/topical"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to Categories
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Topical Category' : 'Create Topical Category'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Category Name */}
        <Card>
          <CardHeader>
            <CardTitle>Category Name</CardTitle>
            <CardDescription>The display name for this category</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="id">Indonesian</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="name-en">Name (English) *</Label>
                  <Input
                    id="name-en"
                    value={formData.name.en}
                    onChange={(e) => handleInputChange('name', e.target.value, 'en')}
                    placeholder="e.g., Faith & Trust, Love & Relationships"
                    required
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-4">
                <div>
                  <Label htmlFor="name-id">Nama (Indonesian)</Label>
                  <Input
                    id="name-id"
                    value={formData.name.id}
                    onChange={(e) => handleInputChange('name', e.target.value, 'id')}
                    placeholder="misal: Iman & Kepercayaan, Kasih & Hubungan"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Category Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>A brief description of what this category covers</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="id">Indonesian</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="description-en">Description (English) *</Label>
                  <Textarea
                    id="description-en"
                    value={formData.description.en}
                    onChange={(e) => handleInputChange('description', e.target.value, 'en')}
                    placeholder="Describe what types of verses and topics are included in this category"
                    rows={4}
                    required
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-4">
                <div>
                  <Label htmlFor="description-id">Deskripsi (Indonesian)</Label>
                  <Textarea
                    id="description-id"
                    value={formData.description.id}
                    onChange={(e) => handleInputChange('description', e.target.value, 'id')}
                    placeholder="Jelaskan jenis ayat dan topik yang termasuk dalam kategori ini"
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Visual Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Visual Settings
            </CardTitle>
            <CardDescription>Icon and color for the category card</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Icon Selection */}
            <div>
              <Label>Icon</Label>
              <Select
                value={formData.icon}
                onValueChange={(value) => handleInputChange('icon', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_ICONS.map((icon) => (
                    <SelectItem key={icon.value} value={icon.value}>
                      {icon.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color Selection */}
            <div>
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => handleInputChange('color', color.value)}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      formData.color === color.value
                        ? 'border-gray-900 scale-110'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Label htmlFor="custom-color">Custom:</Label>
                <Input
                  id="custom-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-16 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="#3B82F6"
                  className="w-28"
                />
              </div>
            </div>

            {/* Preview */}
            <div>
              <Label>Preview</Label>
              <div
                className="mt-2 p-6 rounded-xl text-white flex items-center gap-4"
                style={{ backgroundColor: formData.color }}
              >
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">{AVAILABLE_ICONS.find(i => i.value === formData.icon)?.label[0] || '?'}</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg">{formData.name.en || 'Category Name'}</h3>
                  <p className="text-white/80 text-sm">{formData.description.en?.substring(0, 60) || 'Category description...'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hierarchy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Hierarchy
            </CardTitle>
            <CardDescription>Organize categories in a tree structure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Parent Category</Label>
              <Select
                value={formData.parent_category_id || 'none'}
                onValueChange={(value) => handleInputChange('parent_category_id', value === 'none' ? null : value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select parent category (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Parent (Root Category)</SelectItem>
                  {parentOptions.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name?.en || cat.name || 'Unnamed'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to create a top-level category
              </p>
            </div>

            <div>
              <Label htmlFor="sort-order">Sort Order</Label>
              <Input
                id="sort-order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => handleInputChange('sort_order', parseInt(e.target.value) || 0)}
                min={0}
                className="w-32"
              />
              <p className="text-sm text-gray-500 mt-1">
                Lower numbers appear first
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Publishing */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
            <CardDescription>Control visibility of this category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="status">Published</Label>
                <p className="text-sm text-gray-500">Make this category visible to users</p>
              </div>
              <Switch
                id="status"
                checked={formData.status === 'published'}
                onCheckedChange={(checked) => handleInputChange('status', checked ? 'published' : 'draft')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/content-center/topical')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditMode ? 'Update Category' : 'Create Category'}
          </Button>
        </div>
      </form>
    </div>
  );
}
