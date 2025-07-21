import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Tag, Calendar, Users } from 'lucide-react';
import { useDiscountCodes, type DiscountCodeInput } from '@/hooks/useDiscountCodes';
import { useSubscriptionModules } from '@/hooks/useSubscriptionModules';

export const DiscountCodeManagement = () => {
  const { discountCodes, loading, createDiscountCode, revokeDiscountCode } = useDiscountCodes();
  const { modules } = useSubscriptionModules();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<DiscountCodeInput>({
    code: '',
    type: 'percentage',
    value: 0,
    applicable_modules: [],
    expiry_date: '',
    usage_limit: undefined,
  });

  const generateCode = () => {
    const code = Math.random().toString(36).substr(2, 8).toUpperCase();
    setFormData({ ...formData, code });
  };

  const handleSubmit = async () => {
    const success = await createDiscountCode(formData);
    if (success) {
      setIsCreating(false);
      setFormData({
        code: '',
        type: 'percentage',
        value: 0,
        applicable_modules: [],
        expiry_date: '',
        usage_limit: undefined,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'pending_approval': return 'secondary';
      case 'expired': return 'outline';
      case 'revoked': return 'destructive';
      default: return 'secondary';
    }
  };

  const formatExpiryDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return <div>Loading discount codes...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Discount Codes Management
            </CardTitle>
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Discount Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Discount Code</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="code">Discount Code</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="Enter discount code"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateCode}
                      className="mt-auto"
                    >
                      Generate
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: 'percentage' | 'fixed') => 
                          setFormData({ ...formData, type: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="fixed">Fixed Amount</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="value">
                        Value {formData.type === 'percentage' ? '(%)' : '($)'}
                      </Label>
                      <Input
                        id="value"
                        type="number"
                        min="0"
                        max={formData.type === 'percentage' ? "100" : undefined}
                        value={formData.value}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          value: parseFloat(e.target.value) || 0 
                        })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="modules">Applicable Modules</Label>
                    <div className="grid grid-cols-1 gap-2 mt-2">
                      {modules.map((module) => (
                        <label key={module.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.applicable_modules.includes(module.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  applicable_modules: [...formData.applicable_modules, module.id]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  applicable_modules: formData.applicable_modules.filter(id => id !== module.id)
                                });
                              }
                            }}
                          />
                          <span className="text-sm">{module.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="expiry">Expiry Date (Optional)</Label>
                      <Input
                        id="expiry"
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="usage_limit">Usage Limit (Optional)</Label>
                      <Input
                        id="usage_limit"
                        type="number"
                        min="1"
                        value={formData.usage_limit || ''}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          usage_limit: e.target.value ? parseInt(e.target.value) : undefined 
                        })}
                        placeholder="Unlimited"
                      />
                    </div>
                  </div>

                  <Button onClick={handleSubmit} className="w-full">
                    Submit for Approval
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {discountCodes.map((code) => (
              <Card key={code.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="font-mono font-bold text-lg">{code.code}</div>
                        <Badge variant={getStatusColor(code.status)}>
                          {code.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          {code.type === 'percentage' ? `${code.value}%` : `$${code.value}`} off
                        </div>
                        {code.expiry_date && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Expires {formatExpiryDate(code.expiry_date)}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {code.current_usage}/{code.usage_limit || '∞'} used
                        </div>
                      </div>
                    </div>
                    {code.status === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => revokeDiscountCode(code.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {discountCodes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No discount codes created yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};