import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Bell, Settings, Clock, Activity } from 'lucide-react';
import { PricingManagement } from './PricingManagement';
import { DiscountCodeManagement } from './DiscountCodeManagement';
import { ApprovalWorkflow } from './ApprovalWorkflow';
import { AdminActivityLog } from './AdminActivityLog';
import { useApprovalRequests } from '@/hooks/useApprovalRequests';

export const SubscriptionConfigPanel = () => {
  const { requests } = useApprovalRequests();
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Subscription Configuration</h1>
          <p className="text-muted-foreground">
            Manage pricing, discount codes, and approval workflows
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="pricing" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pricing" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Pricing
          </TabsTrigger>
          <TabsTrigger value="discounts" className="flex items-center gap-2">
            <Badge className="h-4 w-4" />
            Discount Codes
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Approvals
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pricing" className="space-y-6">
          <PricingManagement />
        </TabsContent>

        <TabsContent value="discounts" className="space-y-6">
          <DiscountCodeManagement />
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <ApprovalWorkflow />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <AdminActivityLog />
        </TabsContent>
      </Tabs>
    </div>
  );
};