"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { getOrganizationAnalytics } from "@/lib/supabase/analytics";
import { OrganizationAnalytics } from "@/types/analytics";
import { useOrganization } from "@/hooks/use-organization";

export function Analytics() {
  const [data, setData] = useState<OrganizationAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { organization, isLoading: orgLoading, error: orgError } = useOrganization();

  useEffect(() => {
    async function loadAnalytics() {
      console.log('Loading analytics, organization state:', { 
        id: organization?.id, 
        loading: orgLoading, 
        error: orgError 
      });

      if (orgLoading) {
        console.log('Organization still loading...');
        return;
      }

      if (orgError) {
        console.error('Organization error:', orgError);
        return;
      }

      if (!organization?.id) {
        console.log('No organization ID available');
        return;
      }

      try {
        console.log('Fetching analytics for organization:', organization.id);
        const analytics = await getOrganizationAnalytics(organization.id);
        console.log('Successfully loaded analytics:', analytics);
        setData(analytics);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [organization?.id, orgLoading, orgError]);

  if (orgLoading || isLoading) {
    return <div>Loading analytics...</div>;
  }

  if (orgError) {
    return <div>Error loading organization: {orgError.message}</div>;
  }

  if (!organization) {
    return <div>No organization found. Please contact your administrator.</div>;
  }

  if (!data) {
    return <div>Error loading analytics data. Please try again later.</div>;
  }

  const totalTickets = Object.values(data.ticketMetrics.byStatus).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
      
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Active Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.ticketMetrics.totalActive}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Resolution Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.ticketMetrics.averageResolutionTime.toFixed(1)}h
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.customerMetrics.totalCustomers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Messages/Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.customerMetrics.averageMessagesPerTicket.toFixed(1)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Status Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(data.ticketMetrics.byStatus).map(([status, count]) => (
                <div key={status} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                    <span>{((count / totalTickets) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(count / totalTickets) * 100} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          {/* Priority Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Ticket Priority Distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(data.ticketMetrics.byPriority).map(([priority, count]) => (
                <div key={priority} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{priority}</span>
                    <span>{count} tickets</span>
                  </div>
                  <Progress value={(count / totalTickets) * 100} />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Top Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Top Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.ticketMetrics.topTags.map(tag => (
                  <div key={tag.name} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{tag.name}</span>
                    <span className="text-sm text-muted-foreground">{tag.count} tickets</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-6">
          {/* Agent Performance */}
          <div className="grid gap-4 md:grid-cols-2">
            {data.agentMetrics.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Resolved Tickets</p>
                      <p className="text-2xl font-bold">{agent.ticketsResolved}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Tickets</p>
                      <p className="text-2xl font-bold">{agent.activeTickets}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                      <p className="text-2xl font-bold">{agent.averageResponseTime.toFixed(1)}h</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          {/* Most Active Customers */}
          <Card>
            <CardHeader>
              <CardTitle>Most Active Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.customerMetrics.mostActiveCustomers.map((customer, index) => (
                  <div key={customer.id}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">{customer.name}</span>
                      <span className="text-sm text-muted-foreground">
                        {customer.ticketCount} tickets
                      </span>
                    </div>
                    {index < data.customerMetrics.mostActiveCustomers.length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
