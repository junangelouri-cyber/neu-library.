'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Visit, UserProfile } from '@/lib/types';
import { format, isToday, isThisWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { DateRange } from 'react-day-picker';

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Loader2, FileDown, Search, Users, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export default function VisitorsInfoPage() {
  const { user: authUser, isUserLoading: authLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [collegeFilter, setCollegeFilter] = useState('all');
  const [visitorTypeFilter, setVisitorTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);


  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  // Fetch all visits and users in real-time
  const visitsQuery = useMemoFirebase(() => 
    (firestore && authUser) ? query(collection(firestore, 'visits'), orderBy('createdAt', 'desc')) : null
  , [firestore, authUser]);
  const { data: visits, isLoading: visitsLoading } = useCollection<Visit>(visitsQuery);

  const usersQuery = useMemoFirebase(() => 
    (firestore && authUser) ? collection(firestore, 'users') : null
  , [firestore, authUser]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  // Create a map of users for efficient lookup
  const userMap = useMemo(() => {
    if (!users) return new Map();
    return new Map(users.map(user => [user.id, user]));
  }, [users]);
  
  // Create a list of unique filter options from the data
  const filterOptions = useMemo(() => {
    if (!visits) return { reasons: [], colleges: [] };
    const reasons = [...new Set(visits.map(v => v.purposeOfVisitName).filter(Boolean))].sort();
    const colleges = [...new Set(visits.map(v => v.collegeName).filter(Boolean))].sort();
    return { reasons, colleges };
  }, [visits]);

  // Filter and combine data
  const filteredAndCombinedData = useMemo(() => {
    if (!visits) return [];
    
    // Combine visit with user data
    let combined = visits.map(visit => {
      const user = userMap.get(visit.userId);
      return {
        ...visit,
        userName: visit.isGuest ? visit.fullName : (user?.name || 'N/A'),
        userEmail: visit.isGuest ? 'N/A' : (user?.email || 'N/A'),
        isUserBlocked: user?.isBlocked || false,
      };
    });

    // Apply filters
    if (reasonFilter !== 'all') {
      combined = combined.filter(item => item.purposeOfVisitName === reasonFilter);
    }
    if (collegeFilter !== 'all') {
      combined = combined.filter(item => item.collegeName === collegeFilter);
    }
    if (visitorTypeFilter !== 'all') {
      combined = combined.filter(item => item.visitorType === visitorTypeFilter);
    }
    if (dateRange?.from) {
      const fromDate = startOfDay(dateRange.from);
      const toDate = dateRange.to ? endOfDay(dateRange.to) : endOfDay(dateRange.from);
      combined = combined.filter(item => {
        const visitDate = item.createdAt.toDate();
        return visitDate >= fromDate && visitDate <= toDate;
      });
    }

    if (searchTerm) {
      combined = combined.filter(item =>
        item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return combined;
  }, [visits, userMap, searchTerm, reasonFilter, collegeFilter, visitorTypeFilter, dateRange]);
  
  const stats = useMemo(() => {
    const dataToUse = visits || [];
    const total = dataToUse.length;
    const today = dataToUse.filter(v => v.createdAt && isToday(v.createdAt.toDate())).length;
    const thisWeek = dataToUse.filter(v => v.createdAt && isThisWeek(v.createdAt.toDate(), { weekStartsOn: 1 })).length;
    const thisMonth = dataToUse.filter(v => {
      if (!v.createdAt) return false;
      const visitDate = v.createdAt.toDate();
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      return visitDate >= start && visitDate <= end;
    }).length;

    return { total, today, thisWeek, thisMonth };
  }, [visits]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAndCombinedData.length / rowsPerPage);
  const paginatedData = filteredAndCombinedData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Handles the CSV export functionality
  const handleExport = () => {
    if (filteredAndCombinedData.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There is no data matching the current filters.',
      });
      return;
    }

    const headers = ['Visitor Name', 'Email', 'Visitor Type', 'College', 'Purpose of Visit', 'Date', 'Time'];
    const csvRows = [
      headers.join(','),
      ...filteredAndCombinedData.map(item => [
        `"${item.userName.replace(/"/g, '""')}"`, // Escape double quotes
        `"${item.userEmail}"`,
        `"${item.visitorType || 'N/A'}"`,
        `"${item.collegeName}"`,
        `"${item.purposeOfVisitName.replace(/"/g, '""')}"`,
        `"${item.date}"`,
        `"${item.time}"`,
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `visitor-logs-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
        variant: 'success',
        title: 'Export Successful',
        description: 'The filtered visitor log has been downloaded.',
    });
  };

  const loading = authLoading || visitsLoading || usersLoading;
  
  const StatCard = ({ title, value, icon: Icon }) => (
    <Card className="rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{loading ? <Loader2 className="h-6 w-6 animate-spin" /> : value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Visitors Information</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Visits Today" value={stats.today} icon={Users} />
        <StatCard title="Total Visits This Week" value={stats.thisWeek} icon={CalendarDays} />
        <StatCard title="Total Visits This Month" value={stats.thisMonth} icon={CalendarIcon} />
        <StatCard title="Filtered Results" value={filteredAndCombinedData.length} icon={Search} />
      </div>

      <Card className="rounded-2xl shadow-md">
        <CardHeader>
          <CardTitle>Visitor Log</CardTitle>
          <CardDescription>A detailed log of all visitor check-ins. Use the filters to refine your search.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Input
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="lg:col-span-1"
                />
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                        dateRange.to ? (
                            <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                            </>
                        ) : (
                            format(dateRange.from, "LLL dd, y")
                        )
                        ) : (
                        <span>Pick a date range</span>
                        )}
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={(range) => { setDateRange(range); setCurrentPage(1); }}
                        numberOfMonths={2}
                    />
                    </PopoverContent>
                </Popover>
                <Button onClick={() => setDateRange(undefined)} variant="ghost" disabled={!dateRange}>Clear Date</Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select value={reasonFilter} onValueChange={(value) => { setReasonFilter(value); setCurrentPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="Filter by reason" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Purposes</SelectItem>
                      {filterOptions.reasons.map(reason => <SelectItem key={reason} value={reason}>{reason}</SelectItem>)}
                  </SelectContent>
              </Select>
              <Select value={collegeFilter} onValueChange={(value) => { setCollegeFilter(value); setCurrentPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="Filter by college" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Colleges</SelectItem>
                      {filterOptions.colleges.map(college => <SelectItem key={college} value={college}>{college}</SelectItem>)}
                  </SelectContent>
              </Select>
              <Select value={visitorTypeFilter} onValueChange={(value) => { setVisitorTypeFilter(value); setCurrentPage(1); }}>
                  <SelectTrigger><SelectValue placeholder="Filter by type" /></SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Visitor Types</SelectItem>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Employee">Employee</SelectItem>
                  </SelectContent>
              </Select>
              <Button onClick={handleExport} variant="outline" className="w-full">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export to CSV
              </Button>
            </div>
          </div>
          
          <div className="rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <TableRow>
                  <TableHead>Visitor Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Purpose of Visit</TableHead>
                  <TableHead>Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                  </TableRow>
                ) : paginatedData.length > 0 ? (
                  paginatedData.map((item) => (
                    <TableRow key={item.id} className="even:bg-muted/50">
                      <TableCell>
                        <div className="font-medium">{item.userName}</div>
                        <div className="text-sm text-muted-foreground">{item.userEmail}</div>
                        {item.isUserBlocked && <Badge variant="destructive" className="mt-1">Blocked</Badge>}
                      </TableCell>
                       <TableCell>
                        <div className="flex flex-col gap-1">
                            <Badge variant={item.isGuest ? 'secondary' : 'outline'}>{item.isGuest ? 'Guest' : 'User'}</Badge>
                            {item.visitorType && <Badge variant="outline">{item.visitorType}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.collegeName}</Badge>
                      </TableCell>
                      <TableCell>{item.purposeOfVisitName}</TableCell>
                      <TableCell>
                        <div>{item.date}</div>
                        <div className="text-sm text-muted-foreground">{item.time}</div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No results found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {currentPage} of {totalPages > 0 ? totalPages : 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages === 0}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
