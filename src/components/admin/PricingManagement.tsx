import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Edit, DollarSign, Percent, Package } from 'lucide-react';
import { useSubscriptionModules, type SubscriptionModule, type PricingUpdate } from '@/hooks/useSubscriptionModules';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const PricingManagement = () => {
  const { modules, loading, updateModulePricing, toggleModuleStatus } = useSubscriptionModules();
  const [editingModule, setEditingModule] = useState<SubscriptionModule | null>(null);
  const [formData, setFormData] = useState<PricingUpdate>({
    monthly_price: 0,
    yearly_discount_percentage: 0,
    bundle_discount_percentage: 0,
  });

  const handleEdit = (module: SubscriptionModule) => {
    setEditingModule(module);
    setFormData({
      monthly_price: module.monthly_price,
      yearly_discount_percentage: module.yearly_discount_percentage,
      bundle_discount_percentage: module.bundle_discount_percentage,
    });
  };

  const handleSubmit = async () => {
    if (!editingModule) return;

    const success = await updateModulePricing(editingModule.id, formData);
    if (success) {
      setEditingModule(null);
    }
  };

  const handleToggleStatus = async (module: SubscriptionModule) => {
    await toggleModuleStatus(module.id, !module.is_active);
  };

  const calculateYearlyPrice = (monthlyPrice: number, discountPercentage: number) => {
    const yearlyBeforeDiscount = monthlyPrice * 12;
    return yearlyBeforeDiscount * (1 - discountPercentage / 100);
  };

  if (loading) {
    return <div>Loading pricing information...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Subscription Modules Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            {modules.map((module) => (
              <Card key={module.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Package className="h-5 w-5" />
                      <CardTitle className="text-lg">{module.name}</CardTitle>
                      <Badge variant={module.is_active ? "default" : "secondary"}>
                        {module.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={module.is_active}
                        onCheckedChange={() => handleToggleStatus(module)}
                      />
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(module)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Pricing - {module.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="monthly_price">Monthly Price ($)</Label>
                              <Input
                                id="monthly_price"
                                type="number"
                                value={formData.monthly_price}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  monthly_price: parseFloat(e.target.value) || 0
                                })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="yearly_discount">Yearly Discount (%)</Label>
                              <Input
                                id="yearly_discount"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.yearly_discount_percentage}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  yearly_discount_percentage: parseFloat(e.target.value) || 0
                                })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="bundle_discount">Bundle Discount (%)</Label>
                              <Input
                                id="bundle_discount"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.bundle_discount_percentage}
                                onChange={(e) => setFormData({
                                  ...formData,
                                  bundle_discount_percentage: parseFloat(e.target.value) || 0
                                })}
                              />
                            </div>
                            <div className="pt-4 border-t">
                              <h4 className="font-medium mb-2">Preview</h4>
                              <div className="text-sm space-y-1">
                                <div>Monthly: ${formData.monthly_price}</div>
                                <div>
                                  Yearly: ${calculateYearlyPrice(formData.monthly_price, formData.yearly_discount_percentage).toFixed(2)}
                                  <span className="text-muted-foreground ml-2">
                                    ({formData.yearly_discount_percentage}% off)
                                  </span>
                                </div>
                                <div>Bundle Discount: {formData.bundle_discount_percentage}%</div>
                              </div>
                            </div>
                            <Button onClick={handleSubmit} className="w-full">
                              Submit for Approval
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="text-sm font-medium">Monthly</span>
                      </div>
                      <div className="text-2xl font-bold">${module.monthly_price}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        <span className="text-sm font-medium">Yearly</span>
                      </div>
                      <div className="text-2xl font-bold">
                        ${calculateYearlyPrice(module.monthly_price, module.yearly_discount_percentage).toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {module.yearly_discount_percentage}% discount
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span className="text-sm font-medium">Bundle Discount</span>
                      </div>
                      <div className="text-2xl font-bold">{module.bundle_discount_percentage}%</div>
                      <div className="text-sm text-muted-foreground">
                        When buying all modules
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};