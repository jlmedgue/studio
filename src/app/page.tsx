"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import {
  CalendarIcon,
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  ArrowUpDown,
  Link as LinkIcon,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  FileDown, // Added for export icon
} from "lucide-react";

import type { Task, TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggleButton } from "@/components/theme-toggle-button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

const taskSchema = z.object({
  id: z.string().optional(), // Optional for new tasks
  date: z.date({
    required_error: "A date is required.",
  }),
  description: z.string().min(1, { message: "Description cannot be empty." }),
  link: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')), // Optional and can be empty string
  status: z.enum(["Pending", "Completed"], {
    required_error: "Status is required.",
  }),
});

const TASKS_PER_PAGE = 30;

// Helper function to generate unique IDs
const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

export default function TaskTrackerPage() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof Task | null; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });
  const [isClient, setIsClient] = React.useState(false);
  const { toast } = useToast();

  // Form handling
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      description: "",
      link: "",
      status: "Pending",
      date: new Date(),
    },
  });

  // Load tasks from localStorage on mount
   React.useEffect(() => {
    setIsClient(true); // Indicate component has mounted on client
    try {
      const storedTasks = localStorage.getItem("tasks");
      if (storedTasks) {
        // Parse dates correctly
        const parsedTasks = JSON.parse(storedTasks).map((task: any) => ({
          ...task,
          date: new Date(task.date),
        }));
        setTasks(parsedTasks);
      } else {
        // Add some dummy data if localStorage is empty
        // Increased count from 5 to 35
        const dummyTasks: Task[] = Array.from({ length: 35 }, (_, i) => ({
          id: generateId(),
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Decreasing dates
          description: `Sample Task ${i + 1} description about something important.`,
          link: i % 5 === 0 ? `https://example.com/task/${i + 1}` : undefined, // Add links sometimes
          status: i % 3 === 0 ? 'Completed' : 'Pending', // Vary status more
        }));
        setTasks(dummyTasks);
        localStorage.setItem("tasks", JSON.stringify(dummyTasks));
      }
    } catch (error) {
      console.error("Error loading tasks from localStorage:", error);
      // Initialize with empty or default tasks if error occurs
      setTasks([]);
       toast({
         title: "Error Loading Tasks",
         description: "Could not load tasks from local storage.",
         variant: "destructive",
       });
    }
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []); // Added dependency array with toast to satisfy exhaustive-deps lint rule, though it only runs once


  // Save tasks to localStorage whenever they change
  React.useEffect(() => {
    if (isClient) { // Only run on client after mount
        try {
             localStorage.setItem("tasks", JSON.stringify(tasks));
        } catch (error) {
            console.error("Error saving tasks to localStorage:", error);
            toast({
              title: "Error Saving Tasks",
              description: "Could not save tasks locally.",
              variant: "destructive",
            });
        }
    }
  }, [tasks, isClient, toast]); // Add isClient and toast as dependencies


  const handleAddTask = (values: z.infer<typeof taskSchema>) => {
    const newTask: Task = {
      ...values,
      id: generateId(),
      link: values.link || undefined, // Ensure empty string becomes undefined
    };
    // Add new tasks to the beginning, and reset pagination and sorting to show it
    setTasks((prevTasks) => [newTask, ...prevTasks]);
    setCurrentPage(1); // Go to the first page to see the new task
    setSortConfig({ key: 'date', direction: 'descending' }); // Reset sort
    form.reset({ description: "", link: "", status: "Pending", date: new Date() }); // Reset form to defaults
     toast({ title: "Success", description: "Task added successfully." });
  };

  const handleUpdateTask = (values: z.infer<typeof taskSchema>) => {
    if (!editingTask) return;
    const updatedTask: Task = {
      ...values,
      id: editingTask.id,
      link: values.link || undefined,
    };
    setTasks((prevTasks) =>
      prevTasks.map((task) => (task.id === editingTask.id ? updatedTask : task))
    );
    setEditingTask(null);
    form.reset({ description: "", link: "", status: "Pending", date: new Date() });
     toast({ title: "Success", description: "Task updated successfully." });
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prevTasks) => {
       const newTasks = prevTasks.filter((task) => task.id !== id);
       // After deleting, check if the current page becomes empty and adjust
       const newTotalPages = Math.ceil(newTasks.length / TASKS_PER_PAGE);
       if (currentPage > newTotalPages && newTotalPages > 0) {
         setCurrentPage(newTotalPages);
       } else if (newTasks.length === 0) {
            setCurrentPage(1); // Reset to page 1 if no tasks left
       }
       return newTasks;
     });
     toast({ title: "Success", description: "Task deleted successfully." });
  };

  const startEditing = (task: Task) => {
    setEditingTask(task);
    form.reset({
      ...task,
      link: task.link || '', // Set empty string if undefined for the form
    });
  };

  const cancelEditing = () => {
    setEditingTask(null);
    form.reset({ description: "", link: "", status: "Pending", date: new Date() });
  };

  const requestSort = (key: keyof Task) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    } else if (sortConfig.key === key && sortConfig.direction === 'descending') {
        // Optional: third click resets sort or reverses again, here just reverses
        direction = 'ascending';
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // Reset to first page on sort change
  };

  // Filtering and Sorting Logic
  const filteredTasks = React.useMemo(() => {
    let tempTasks = [...tasks]; // Create a copy to sort

    // Apply sorting
    if (sortConfig.key) {
      tempTasks.sort((a, b) => {
        const aValue = a[sortConfig.key!];
        const bValue = b[sortConfig.key!];

        // Handle undefined values - place them at the end when ascending, beginning when descending
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
        if (bValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;

        let comparison = 0;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          comparison = aValue.localeCompare(bValue);
        } else if (aValue instanceof Date && bValue instanceof Date) {
          comparison = aValue.getTime() - bValue.getTime();
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
            comparison = aValue === bValue ? 0 : aValue ? -1 : 1; // Example: true comes first
        }
        // Handle other types if necessary, default to no change

        return sortConfig.direction === 'ascending' ? comparison : -comparison;
      });
    }

    // Apply search filter after sorting
    if (searchTerm) {
       const lowerCaseSearchTerm = searchTerm.toLowerCase();
       tempTasks = tempTasks.filter(task =>
         task.description.toLowerCase().includes(lowerCaseSearchTerm) ||
         format(task.date, 'yyyy-MM-dd').includes(lowerCaseSearchTerm) ||
         format(task.date, 'PPP').toLowerCase().includes(lowerCaseSearchTerm) || // Search long formatted date
         task.status.toLowerCase().includes(lowerCaseSearchTerm) // Search status
       );
    }

    return tempTasks;
  }, [tasks, searchTerm, sortConfig]);


  // Pagination Logic
  const totalPages = Math.ceil(filteredTasks.length / TASKS_PER_PAGE);
  const paginatedTasks = React.useMemo(() => {
    // Ensure currentPage is valid
    const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages || 1));
    if (currentPage !== validCurrentPage) {
        // This should ideally not happen if state updates correctly, but as a safeguard
        setCurrentPage(validCurrentPage);
    }
    const startIndex = (validCurrentPage - 1) * TASKS_PER_PAGE;
    const endIndex = startIndex + TASKS_PER_PAGE;
    return filteredTasks.slice(startIndex, endIndex);
  }, [filteredTasks, currentPage, totalPages]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages || 1)));
  };

   const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
     setSearchTerm(event.target.value);
     setCurrentPage(1); // Reset to first page on new search
   };

   const clearSearch = () => {
        setSearchTerm("");
        setCurrentPage(1); // Reset to first page
   };

  const onSubmit = editingTask ? handleUpdateTask : handleAddTask;

  // Render loading state or placeholder if not client
  if (!isClient) {
      return (
          <div className="flex items-center justify-center min-h-screen p-4 text-center">
              <p className="text-muted-foreground">Loading Task Tracker...</p>
          </div>
      );
  }


  return (
    <div className="container mx-auto p-4 md:p-8 min-h-screen flex flex-col">
      <header className="flex justify-between items-center mb-6 pb-4 border-b">
        <h1 className="text-3xl font-bold text-primary">Task Tracker Pro</h1>
        <ThemeToggleButton />
      </header>

      {/* Add/Edit Form Card */}
      <div className="mb-8 p-6 bg-card text-card-foreground rounded-lg border shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">
          {editingTask ? "Modify Task" : "Add New Task"}
        </h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start"> {/* items-start for alignment */}
              {/* Date Field */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal", // Ensure full width
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => field.onChange(date ?? new Date())} // Ensure date is always set
                          // disabled={(date) =>
                          //   date > new Date() || date < new Date("1900-01-01")
                          // }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description Field */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="lg:col-span-2"> {/* Span 2 cols on large screens */}
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe the task..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

                {/* Link Field */}
               <FormField
                control={form.control}
                name="link"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link (Optional)</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status Field */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 pt-4">
               {editingTask && (
                 <Button type="button" variant="outline" onClick={cancelEditing}>
                   Cancel
                 </Button>
               )}
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {editingTask ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
                {editingTask ? "Update Task" : "Add Task"}
              </Button>
            </div>
          </form>
        </Form>
      </div>

        {/* Search and Export */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div className="flex items-center space-x-2 w-full md:w-auto">
                <Label htmlFor="search-tasks" className="sr-only">Search Tasks</Label>
                 <div className="relative w-full max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                          id="search-tasks"
                          type="text"
                          placeholder="Search description, date, status..."
                          value={searchTerm}
                          onChange={handleSearchChange}
                          className="pl-9" // Padding left for icon
                      />
                      {searchTerm && (
                         <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={clearSearch}
                            aria-label="Clear search"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                      )}
                </div>
            </div>
             {/* Export Button */}
             <Dialog>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <FileDown className="mr-2 h-4 w-4" />
                        Export Tasks
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Export Tasks</DialogTitle>
                        <DialogDescription>
                           This feature allows exporting tasks to formats like CSV or Excel. (Functionality not yet implemented).
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                         {/* Placeholder for Export Options */}
                         <p className="text-sm text-muted-foreground">Export format and date range options will appear here.</p>
                     </div>
                    <DialogFooter>
                        <DialogClose asChild>
                             <Button type="button" variant="outline">Cancel</Button>
                         </DialogClose>
                        {/* Placeholder for actual Export Button */}
                         <Button type="button" disabled>Export Now</Button>
                     </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>

      {/* Task List */}
      <div className="flex-grow overflow-x-auto bg-card rounded-lg border shadow-sm p-1">
         <Table>
           <TableHeader>
             <TableRow>
               <TableHead className="w-[150px]">
                 <Button variant="ghost" onClick={() => requestSort('date')} className="px-0 hover:bg-transparent">
                    Date
                    {sortConfig.key === 'date' && <ArrowUpDown className={cn("ml-2 h-4 w-4", sortConfig.direction === 'ascending' ? '' : 'rotate-180')} />}
                    <span className="sr-only">Sort by date</span>
                 </Button>
               </TableHead>
               <TableHead>
                <Button variant="ghost" onClick={() => requestSort('description')} className="px-0 hover:bg-transparent">
                     Description
                     {sortConfig.key === 'description' && <ArrowUpDown className={cn("ml-2 h-4 w-4", sortConfig.direction === 'ascending' ? '' : 'rotate-180')} />}
                     <span className="sr-only">Sort by description</span>
                 </Button>
               </TableHead>
               <TableHead className="w-[100px] text-center">Link</TableHead>
               <TableHead className="w-[120px]">
                  <Button variant="ghost" onClick={() => requestSort('status')} className="px-0 hover:bg-transparent">
                    Status
                    {sortConfig.key === 'status' && <ArrowUpDown className={cn("ml-2 h-4 w-4", sortConfig.direction === 'ascending' ? '' : 'rotate-180')} />}
                    <span className="sr-only">Sort by status</span>
                 </Button>
               </TableHead>
               <TableHead className="w-[130px] text-right">Actions</TableHead>
             </TableRow>
           </TableHeader>
           <TableBody>
             {paginatedTasks.length > 0 ? (
               paginatedTasks.map((task) => (
                 <TableRow key={task.id} data-state={editingTask?.id === task.id ? 'selected' : undefined}>
                   <TableCell>{format(task.date, "PPP")}</TableCell>
                   <TableCell className="font-medium max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl truncate" title={task.description}>
                     {task.description}
                   </TableCell>
                   <TableCell className="text-center">
                     {task.link ? (
                       <Button variant="ghost" size="icon" asChild>
                           <a
                             href={task.link}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-accent hover:text-accent/80"
                             title={`Open link: ${task.link}`}
                             aria-label={`Open link for task ${task.description}`}
                           >
                              <LinkIcon className="h-4 w-4"/>
                           </a>
                       </Button>
                     ) : (
                       <span className="text-muted-foreground">-</span>
                     )}
                   </TableCell>
                   <TableCell>
                     <Badge
                       variant={task.status === "Completed" ? "secondary" : "outline"}
                       className={cn(
                           "capitalize", // Ensure consistent capitalization
                           task.status === "Completed" ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border border-green-300 dark:border-green-700"
                                                       : "border-yellow-400 text-yellow-700 dark:border-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30"
                           )}
                      >
                       {task.status}
                     </Badge>
                   </TableCell>
                   <TableCell className="text-right space-x-1">
                     <Button variant="ghost" size="icon" onClick={() => startEditing(task)} aria-label={`Modify task ${task.description}`}>
                       <Pencil className="h-4 w-4 text-blue-600" />
                     </Button>
                     <AlertDialog>
                       <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Delete task ${task.description}`}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                       </AlertDialogTrigger>
                       <AlertDialogContent>
                         <AlertDialogHeader>
                           <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                           <AlertDialogDescription>
                             This action cannot be undone. This will permanently delete the task: <strong className="break-all">"{task.description}"</strong>.
                           </AlertDialogDescription>
                         </AlertDialogHeader>
                         <AlertDialogFooter>
                           <AlertDialogCancel>Cancel</AlertDialogCancel>
                           <AlertDialogAction onClick={() => handleDeleteTask(task.id)} className="bg-destructive hover:bg-destructive/90">
                             Delete Task
                           </AlertDialogAction>
                         </AlertDialogFooter>
                       </AlertDialogContent>
                     </AlertDialog>
                   </TableCell>
                 </TableRow>
               ))
             ) : (
               <TableRow>
                 <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                   {searchTerm ? "No tasks match your search criteria." : "No tasks added yet. Use the form above!"}
                 </TableCell>
               </TableRow>
             )}
           </TableBody>
         </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
         <div className="flex items-center justify-between mt-6 p-4 bg-card rounded-lg border shadow-sm">
             <span className="text-sm text-muted-foreground">
                 Page {currentPage} of {totalPages} ({filteredTasks.length} task{filteredTasks.length === 1 ? '' : 's'})
             </span>
            <div className="flex items-center space-x-1">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(1)}
                    disabled={currentPage === 1}
                    aria-label="Go to first page"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>
                 <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Go to previous page"
                 >
                    <ChevronLeft className="h-4 w-4" />
                 </Button>
                 {/* Page number input - Optional, can be complex */}
                 {/* <span className="px-2 text-sm">Page {currentPage}</span> */}
                 <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Go to next page"
                 >
                     <ChevronRight className="h-4 w-4" />
                 </Button>
                 <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(totalPages)}
                    disabled={currentPage === totalPages}
                    aria-label="Go to last page"
                 >
                     <ChevronsRight className="h-4 w-4" />
                 </Button>
            </div>
         </div>
      )}
    </div>
  );
}
