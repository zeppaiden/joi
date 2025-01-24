"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { getOrganizationAnalytics } from "@/lib/supabase/analytics";
import { OrganizationAnalytics } from "@/types/analytics";
import { useOrganization } from "@/hooks/use-organization";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis, Bar, BarChart, Pie, PieChart, Cell, CartesianGrid } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Label } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

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
          {/* Two Column Layout for Charts */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Ticket Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Ticket Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer 
                  className="h-[300px]"
                  config={{
                    tickets: {
                      theme: {
                        light: "hsl(var(--primary))",
                        dark: "hsl(var(--primary))"
                      }
                    }
                  }}
                >
                  <LineChart data={data.ticketMetrics.dailyTickets}>
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis />
                    <Line 
                      type="monotone"
                      dataKey="count"
                      stroke="var(--color-tickets)"
                      strokeWidth={2}
                    />
                    <ChartTooltip
                      content={({ active, payload }) => 
                        active && payload?.length ? (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <span className="font-medium">Date:</span>
                              <span>{new Date(payload[0].payload.date).toLocaleDateString()}</span>
                              <span className="font-medium">Tickets:</span>
                              <span>{payload[0].value}</span>
                            </div>
                          </div>
                        ) : null
                      }
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Priority Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Ticket Priority Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer 
                  className="h-[300px]"
                  config={{
                    low: {
                      theme: {
                        light: "#22c55e",
                        dark: "#22c55e"
                      }
                    },
                    medium: {
                      theme: {
                        light: "#eab308",
                        dark: "#eab308"
                      }
                    },
                    high: {
                      theme: {
                        light: "#f97316",
                        dark: "#f97316"
                      }
                    },
                    urgent: {
                      theme: {
                        light: "#ef4444",
                        dark: "#ef4444"
                      }
                    }
                  }}
                >
                  <PieChart>
                    <Pie
                      data={Object.entries(data.ticketMetrics.byPriority).map(([priority, count]) => ({
                        name: priority,
                        value: count
                      }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                    >
                      {Object.keys(data.ticketMetrics.byPriority).map((priority) => (
                        <Cell key={priority} fill={`var(--color-${priority})`} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => 
                        active && payload?.length ? (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <span className="font-medium">Priority:</span>
                              <span className="capitalize">{payload[0].name}</span>
                              <span className="font-medium">Count:</span>
                              <span>{payload[0].value}</span>
                            </div>
                          </div>
                        ) : null
                      }
                    />
                  </PieChart>
                </ChartContainer>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {Object.entries(data.ticketMetrics.byPriority).map(([priority, count]) => (
                    <div key={priority} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-full" 
                        style={{ backgroundColor: `var(--color-${priority})` }}
                      />
                      <span className="text-sm capitalize">{priority}</span>
                      <span className="text-sm text-muted-foreground ml-auto">{count}</span>
                    </div>
                  ))}
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
