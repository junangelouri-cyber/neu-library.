'use client';

import { useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Loader2, Users, CalendarDays, Calendar, BookOpenCheck, Sigma, BarChart3 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Pie, PieChart, Legend, Cell } from 'recharts';
import { collection } from 'firebase/firestore';
import type { UserProfile, Visit } from '@/lib/types';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

const CHART_COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const ChartEmptyState = ({ title }: { title: string }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-muted/50 p-8 text-center">
    <div className="rounded-full border-4 border-dashed border-muted-foreground/30 p-4">
      <BarChart3 className="h-10 w-10 text-muted-foreground/50" />
    </div>
    <h3 className="text-lg font-semibold text-muted-foreground">{title}</h3>
    <p className="text-sm text-muted-foreground">No data has been recorded yet.</p>
  </div>
);


export default function AdminStatisticsPage() {
  const firestore = useFirestore();

  const visitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'visits') : null, [firestore]);
  const { data: visits, isLoading: visitsLoading } = useCollection<Visit>(visitsQuery);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const stats = useMemo(() => {
    if (!visits || !users) return null;

    const totalVisits = visits.length;
    const visitsToday = visits.filter(v => v.createdAt && isToday(v.createdAt.toDate())).length;
    const visitsThisWeek = visits.filter(v => v.createdAt && isThisWeek(v.createdAt.toDate(), { weekStartsOn: 1 })).length;
    const visitsThisMonth = visits.filter(v => v.createdAt && isThisMonth(v.createdAt.toDate())).length;

    const undergradVisits = visits.filter(v => v.educationLevel === 'Undergraduate');
    const gradVisits = visits.filter(v => v.educationLevel === 'Graduate Studies');
    
    const visitsByUndergradCollege = undergradVisits.reduce((acc, visit) => {
        if (visit.collegeName && visit.collegeName.trim() !== '') {
            acc[visit.collegeName] = (acc[visit.collegeName] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    const visitsByGradProgram = gradVisits.reduce((acc, visit) => {
      if (visit.collegeName && visit.collegeName.trim() !== '') {
          acc[visit.collegeName] = (acc[visit.collegeName] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const visitsByPurpose = visits.reduce((acc, visit) => {
        if (visit.purposeOfVisitName && visit.purposeOfVisitName.trim() !== '') {
            acc[visit.purposeOfVisitName] = (acc[visit.purposeOfVisitName] || 0) + 1;
        }
        return acc;
    }, {} as Record<string, number>);

    return {
      totalVisits,
      visitsToday,
      visitsThisWeek,
      visitsThisMonth,
      visitsByUndergradCollegeChart: Object.entries(visitsByUndergradCollege).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count),
      visitsByGradProgramChart: Object.entries(visitsByGradProgram).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count),
      visitsByPurposeChart: Object.entries(visitsByPurpose).map(([name, count]) => ({ name, count })).sort((a,b) => b.count - a.count),
    };
  }, [visits, users]);

  const loading = visitsLoading || usersLoading || !stats;

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Dashboard Data...</p>
      </div>
    );
  }

  const StatCard = ({ title, value, icon: Icon }) => (
    <Card className="rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Welcome to New Era University Library System</h1>
        <p className="text-lg text-muted-foreground mt-2">Administrator Control Panel</p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Visitors Today" value={stats.visitsToday} icon={Users} />
        <StatCard title="Total Visitors This Week" value={stats.visitsThisWeek} icon={CalendarDays} />
        <StatCard title="Total Visitors This Month" value={stats.visitsThisMonth} icon={Calendar} />
        <StatCard title="All-Time Total Visits" value={stats.totalVisits} icon={Sigma} />
      </div>
      
      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Visitors by Undergraduate College</CardTitle>
              <CardDescription>Distribution of library visits per undergraduate college.</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.visitsByUndergradCollegeChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.visitsByUndergradCollegeChart}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip wrapperClassName="!bg-background !border-border rounded-lg shadow-lg" cursor={{fill: 'hsl(var(--muted))'}} />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmptyState title="No Undergraduate Visits" />
              )}
            </CardContent>
          </Card>
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle>Visitors by Graduate Program</CardTitle>
              <CardDescription>Distribution of library visits per graduate program.</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.visitsByGradProgramChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.visitsByGradProgramChart}>
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Tooltip wrapperClassName="!bg-background !border-border rounded-lg shadow-lg" cursor={{fill: 'hsl(var(--muted))'}} />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmptyState title="No Graduate Program Visits" />
              )}
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          <Card className="rounded-2xl shadow-sm sticky top-20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpenCheck className="h-5 w-5" />
                Visitor Purposes
              </CardTitle>
              <CardDescription>A breakdown of the primary reasons for visiting the library.</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.visitsByPurposeChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={stats.visitsByPurposeChart}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 20;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return (
                           <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                            {name} ({(percent * 100).toFixed(0)}%)
                          </text>
                        );
                      }}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="name"
                    >
                      {stats.visitsByPurposeChart.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" />
                      ))}
                    </Pie>
                    <Tooltip wrapperClassName="!bg-background !border-border rounded-lg shadow-lg" />
                    <Legend iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
               ) : (
                <ChartEmptyState title="No Visitor Purposes Recorded" />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
