"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { getOrganizationAnalytics } from "@/lib/supabase/analytics";
import { OrganizationAnalytics } from "@/types/analytics";
import { useOrganization } from "@/hooks/use-organization";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, Bar, BarChart, Pie, PieChart, CartesianGrid } from "recharts";
import { TrendingDown, TrendingUp, Building2 } from "lucide-react";
import { Label } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function Analytics() {
  const [data, setData] = useState<OrganizationAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { organization, isLoading: orgLoading, error: orgError } = useOrganization();
  const router = useRouter();

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
        setIsLoading(false);
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
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-9 w-64" /> {/* Dashboard Title */}
        
        {/* Tab List Skeleton */}
        <div className="h-10 flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-full w-24" />
          ))}
        </div>

        {/* Overview Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[140px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Chart Skeleton */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-36" />
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <div className="mx-auto aspect-square max-h-[250px] flex items-center justify-center">
              <Skeleton className="h-[250px] w-[250px] rounded-full" />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">No Organization Found</h2>
        <p className="text-muted-foreground text-center mb-6 max-w-md">
          You need to be part of an organization to view analytics. Create a new organization or ask your administrator for an invite.
        </p>
        <Button onClick={() => router.push('/protected/organization')}>
          Manage Organizations
        </Button>
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <h2 className="text-2xl font-semibold text-destructive mb-2">Error Loading Organization</h2>
        <p className="text-muted-foreground text-center mb-6">
          {orgError.message}
        </p>
        <Button variant="outline" onClick={() => router.push('/protected/organization')}>
          Go to Organizations
        </Button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6">
        <h2 className="text-2xl font-semibold mb-2">Error Loading Analytics</h2>
        <p className="text-muted-foreground text-center mb-6">
          Unable to load analytics data. Please try again later.
        </p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
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
                <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.ticketMetrics.averageRating.toFixed(1)} ★
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Object.values(data.ticketMetrics.ratingDistribution).reduce((a, b) => a + b, 0)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Distribution */}
          <Card className="flex flex-col">
            <CardHeader className="items-center pb-0">
              <CardTitle>Ticket Status Distribution</CardTitle>
              <CardDescription>Current Status Overview</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <ChartContainer
                config={{
                  open: {
                    label: "Open",
                    color: "hsl(142.1 76.2% 36.3%)"  // Green
                  },
                  in_progress: {
                    label: "In Progress",
                    color: "hsl(47.9 95.8% 53.1%)"   // Yellow
                  },
                  resolved: {
                    label: "Resolved",
                    color: "hsl(221.2 83.2% 53.3%)"  // Blue
                  },
                  closed: {
                    label: "Closed",
                    color: "hsl(215.4 16.3% 46.9%)"  // Gray
                  }
                }}
                className="mx-auto aspect-square max-h-[250px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent />}
                  />
                  <Pie
                    data={Object.entries(data.ticketMetrics.byStatus).map(([status, count]) => ({
                      status,
                      count,
                      fill: status === 'open' ? "hsl(142.1 76.2% 36.3%)" :
                            status === 'in_progress' ? "hsl(47.9 95.8% 53.1%)" :
                            status === 'resolved' ? "hsl(221.2 83.2% 53.3%)" :
                            "hsl(215.4 16.3% 46.9%)"
                    }))}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={60}
                    strokeWidth={5}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          const openCount = data.ticketMetrics.byStatus.open;
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-3xl font-bold"
                              >
                                {openCount}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 24}
                                className="fill-muted-foreground text-sm"
                              >
                                Open
                              </tspan>
                            </text>
                          )
                        }
                        return null;
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm">
              {data.ticketMetrics.dailyTickets.length >= 2 && (
                <div className="flex items-center gap-2 font-medium leading-none">
                  {(() => {
                    const today = data.ticketMetrics.dailyTickets[data.ticketMetrics.dailyTickets.length - 1];
                    const yesterday = data.ticketMetrics.dailyTickets[data.ticketMetrics.dailyTickets.length - 2];
                    const percentChange = yesterday.count === 0 
                      ? 100 
                      : ((today.count - yesterday.count) / yesterday.count) * 100;
                    const isUp = percentChange > 0;
                    return (
                      <>
                        {isUp ? "Up" : "Down"} by {Math.abs(percentChange).toFixed(1)}% from yesterday
                        {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                      </>
                    );
                  })()}
                </div>
              )}
              <div className="leading-none text-muted-foreground">
                Total tickets: {totalTickets}
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-6">
          {/* Charts Section */}
          <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
            {/* Daily Ticket Volume */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Daily Ticket Volume</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <ChartContainer
                  config={{
                    tickets: {
                      label: "Tickets",
                      color: "hsl(221.2 83.2% 53.3%)"
                    }
                  }}
                  className="aspect-[4/3]"
                >
                  <LineChart data={data.ticketMetrics.dailyTickets}>
                    <XAxis dataKey="date" />
                    <YAxis />
                    <CartesianGrid strokeDasharray="3 3" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="tickets"
                      stroke="hsl(221.2 83.2% 53.3%)"
                      strokeWidth={2}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Ticket Priority Distribution */}
            <Card className="flex flex-col">
              <CardHeader>
                <CardTitle>Ticket Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <ChartContainer
                  config={{
                    low: {
                      label: "Low",
                      color: "hsl(142.1 76.2% 36.3%)"
                    },
                    medium: {
                      label: "Medium", 
                      color: "hsl(47.9 95.8% 53.1%)"
                    },
                    high: {
                      label: "High",
                      color: "hsl(24.6 95% 53.1%)"
                    },
                    urgent: {
                      label: "Urgent",
                      color: "hsl(0 72.2% 50.6%)"
                    }
                  }}
                  className="aspect-[4/3]"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={[
                        { name: "low", value: data.ticketMetrics.byPriority.low, fill: "hsl(142.1 76.2% 36.3%)" },
                        { name: "medium", value: data.ticketMetrics.byPriority.medium, fill: "hsl(47.9 95.8% 53.1%)" },
                        { name: "high", value: data.ticketMetrics.byPriority.high, fill: "hsl(24.6 95% 53.1%)" },
                        { name: "urgent", value: data.ticketMetrics.byPriority.urgent, fill: "hsl(0 72.2% 50.6%)" }
                      ]}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={80}
                    />
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[hsl(142.1_76.2%_36.3%)]" />
                    <span>Low</span>
                    <span className="ml-auto">{data.ticketMetrics.byPriority.low}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[hsl(47.9_95.8%_53.1%)]" />
                    <span>Medium</span>
                    <span className="ml-auto">{data.ticketMetrics.byPriority.medium}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[hsl(24.6_95%_53.1%)]" />
                    <span>High</span>
                    <span className="ml-auto">{data.ticketMetrics.byPriority.high}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-[hsl(0_72.2%_50.6%)]" />
                    <span>Urgent</span>
                    <span className="ml-auto">{data.ticketMetrics.byPriority.urgent}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

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
          {/* Agent Performance Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance Comparison</CardTitle>
              <CardDescription>Resolved vs Active Tickets</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer 
                config={{
                  resolved: {
                    label: "Resolved Tickets",
                    color: "hsl(var(--primary))"
                  },
                  active: {
                    label: "Active Tickets",
                    color: "hsl(var(--secondary))"
                  }
                }}
              >
                <BarChart 
                  data={data.agentMetrics.map(agent => ({
                    name: agent.name,
                    resolved: agent.ticketsResolved,
                    active: agent.activeTickets
                  }))}
                  margin={{ left: 40, right: 40, top: 20, bottom: 20 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                  />
                  <YAxis />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dashed" />}
                  />
                  <Bar 
                    dataKey="resolved" 
                    fill="var(--color-resolved)" 
                    radius={[4, 4, 0, 0]} 
                    name="Resolved Tickets"
                  />
                  <Bar 
                    dataKey="active" 
                    fill="var(--color-active)" 
                    radius={[4, 4, 0, 0]} 
                    name="Active Tickets"
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
              <div className="leading-none text-muted-foreground">
                Showing resolved and active tickets per agent
              </div>
            </CardFooter>
          </Card>

          {/* Agent Performance Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            {data.agentMetrics.map((agent) => (
              <Card key={agent.id}>
                <CardHeader>
                  <CardTitle>{agent.name}</CardTitle>
                  <CardDescription>
                    {agent.activeTickets} Active • {agent.ticketsResolved} Resolved
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Average Rating</span>
                    <span className="font-medium">
                      {agent.averageRating.toFixed(1)} ★ ({agent.totalRatings} ratings)
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Rating Distribution</div>
                    <div className="grid grid-cols-5 gap-1">
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <div key={rating} className="space-y-1">
                          <div className="h-20 relative">
                            <div 
                              className="absolute bottom-0 w-full bg-primary/20 rounded-sm"
                              style={{ 
                                height: `${(agent.ratingDistribution[rating as 1 | 2 | 3 | 4 | 5] / agent.totalRatings) * 100}%`,
                                minHeight: '1px'
                              }}
                            />
                          </div>
                          <div className="text-center text-xs">{rating}★</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Response Time</span>
                    <span className="font-medium">{agent.averageResponseTime.toFixed(1)}h</span>
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
              <CardDescription>Customer activity and satisfaction metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.customerMetrics.mostActiveCustomers.map((customer, index) => (
                  <div key={customer.id}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {customer.ticketCount} tickets
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          Average Rating: {customer.averageRating > 0 ? `${customer.averageRating.toFixed(1)} ★` : 'No ratings'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          from {customer.totalRatings} {customer.totalRatings === 1 ? 'rating' : 'ratings'}
                        </div>
                      </div>
                    </div>

                    {index < data.customerMetrics.mostActiveCustomers.length - 1 && (
                      <Separator className="my-4" />
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
