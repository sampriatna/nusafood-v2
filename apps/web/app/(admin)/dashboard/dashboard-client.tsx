"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  ClipboardList,
  Filter,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import {
  ChecklistSummaryCards,
  DashboardSummaryCards,
} from "@/components/dashboard-summary";
import { MobileHeader } from "@/components/mobile-header";
import { TaskCard, TaskCardSkeleton } from "@/components/task-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchOutlets,
  fetchTasks,
} from "@/lib/api/client";
import type {
  ChecklistSummary,
  DashboardSummary,
  Task,
  TaskStatus,
} from "@nusafood/types";

import {
  dateKeyInAppTz,
  isDateKeyInRange,
  todayKeyInAppTz,
  weekRangeKeysInAppTz,
} from "@/lib/format-datetime";

const statusOptions: { value: TaskStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Semua Status" },
  { value: "OPEN", label: "Belum Dikerjakan" },
  { value: "SUBMITTED", label: "Terkirim" },
  { value: "DONE", label: "Selesai" },
  { value: "LATE", label: "Terlambat" },
  { value: "REVISI", label: "Perlu Revisi" },
];

type TimePeriod = "today" | "week" | "month";

function getTaskDate(deadline: string): string {
  return dateKeyInAppTz(deadline);
}

function getTodayDate(): string {
  return todayKeyInAppTz();
}

function isWithinTimePeriod(deadline: string, period: TimePeriod): boolean {
  const todayDate = getTodayDate();
  const taskDate = getTaskDate(deadline);

  if (!taskDate) return false;

  switch (period) {
    case "today":
      return taskDate === todayDate;
    case "week": {
      const { start, end } = weekRangeKeysInAppTz();
      return isDateKeyInRange(taskDate, start, end);
    }
    case "month":
      return taskDate.slice(0, 7) === todayDate.slice(0, 7);
    default:
      return false;
  }
}

function matchesOutlet(value: string, selected: string): boolean {
  if (selected === "ALL") return true;
  return value.toLowerCase() === selected.toLowerCase();
}

function matchesStatusFilter(
  task: Task,
  selectedStatus: TaskStatus | "ALL",
): boolean {
  if (selectedStatus === "ALL") return true;

  const openStatuses = ["CREATED", "SENT", "WA_FAILED", "OPEN", "OPENED"];
  const submittedStatuses = [
    "SUBMITTED",
    "RESUBMITTED",
    "WAITING_VERIFICATION",
  ];
  const doneStatuses = ["DONE", "VERIFIED"];
  const revisiStatuses = ["REVISI", "REVISION", "REVISION_REQUESTED"];

  switch (selectedStatus) {
    case "OPEN":
      return (
        openStatuses.includes(task.status) &&
        !(
          task.is_late === true ||
          task.status === "LATE"
        )
      );
    case "SUBMITTED":
      return submittedStatuses.includes(task.status);
    case "DONE":
      return doneStatuses.includes(task.status);
    case "LATE":
      return task.status === "LATE" || task.is_late === true;
    case "REVISI":
      return revisiStatuses.includes(task.status);
    default:
      return true;
  }
}

function isChecklistTask(task: Task): boolean {
  return (
    task.checklist_mode === true ||
    task.task_id.startsWith("CHK-TSK-")
  );
}

function calculateChecklistSummary(taskList: Task[]): ChecklistSummary {
  const checklistTasks = taskList.filter(isChecklistTask);

  const openStatuses = ["CREATED", "SENT", "WA_FAILED", "OPEN", "OPENED"];
  const submittedStatuses = [
    "SUBMITTED",
    "RESUBMITTED",
    "WAITING_VERIFICATION",
  ];
  const doneStatuses = ["DONE", "VERIFIED"];
  const revisiStatuses = ["REVISI", "REVISION", "REVISION_REQUESTED"];

  return {
    total: checklistTasks.length,
    open: checklistTasks.filter((t) => openStatuses.includes(t.status)).length,
    submitted: checklistTasks.filter((t) =>
      submittedStatuses.includes(t.status),
    ).length,
    done: checklistTasks.filter((t) => doneStatuses.includes(t.status)).length,
    late: checklistTasks.filter(
      (t) => t.status === "LATE" || t.is_late === true,
    ).length,
    revisi: checklistTasks.filter((t) => revisiStatuses.includes(t.status))
      .length,
  };
}

function calculateTaskSummary(taskList: Task[]): DashboardSummary {
  const manualTasks = taskList.filter((t) => !isChecklistTask(t));

  const openStatuses = ["CREATED", "SENT", "WA_FAILED", "OPEN", "OPENED"];
  const submittedStatuses = [
    "SUBMITTED",
    "RESUBMITTED",
    "WAITING_VERIFICATION",
  ];
  const doneStatuses = ["DONE", "VERIFIED"];
  const revisiStatuses = ["REVISI", "REVISION", "REVISION_REQUESTED"];

  return {
    total: manualTasks.length,
    open: manualTasks.filter((t) => openStatuses.includes(t.status)).length,
    submitted: manualTasks.filter((t) =>
      submittedStatuses.includes(t.status),
    ).length,
    done: manualTasks.filter((t) => doneStatuses.includes(t.status)).length,
    late: manualTasks.filter(
      (t) => t.status === "LATE" || t.is_late === true,
    ).length,
    revisi: manualTasks.filter((t) => revisiStatuses.includes(t.status))
      .length,
  };
}

export function DashboardClient() {
  const listRef = useRef<HTMLDivElement>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [outlets, setOutlets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"tasks" | "checklists">("tasks");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | "ALL">(
    "ALL",
  );
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("month");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [tasksResult, outletsResult] = await Promise.all([
        fetchTasks({ limit: 500 }),
        fetchOutlets(),
      ]);

      if (tasksResult.success && tasksResult.data) {
        setTasks(tasksResult.data);
      } else {
        setTasks([]);
        setLoadError(tasksResult.error || "Gagal memuat tugas");
      }

      if (outletsResult.success && outletsResult.data) {
        setOutlets(outletsResult.data.map((o) => o.name || o.code));
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Gagal memuat data");
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedOutlet, selectedStatus, searchQuery, timePeriod]);

  const manualTasks = tasks.filter((t) => !isChecklistTask(t));
  const checklistTasks = tasks.filter(isChecklistTask);

  const tasksInPeriod = useMemo(
    () =>
      manualTasks.filter(
        (task) =>
          isWithinTimePeriod(task.deadline, timePeriod) &&
          matchesOutlet(task.outlet, selectedOutlet),
      ),
    [manualTasks, timePeriod, selectedOutlet],
  );

  const checklistsInPeriod = useMemo(
    () =>
      checklistTasks.filter(
        (task) =>
          isWithinTimePeriod(task.deadline, timePeriod) &&
          matchesOutlet(task.outlet, selectedOutlet),
      ),
    [checklistTasks, timePeriod, selectedOutlet],
  );

  const summary = useMemo(
    () => calculateTaskSummary(tasksInPeriod),
    [tasksInPeriod],
  );

  const checklistSummary = useMemo(
    () => calculateChecklistSummary(checklistsInPeriod),
    [checklistsInPeriod],
  );

  const activeSummaryKey =
    selectedStatus === "ALL" ? "total" : selectedStatus.toLowerCase();

  const filteredTasks = manualTasks
    .filter((task) => {
      if (!isWithinTimePeriod(task.deadline, timePeriod)) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          task.task_title.toLowerCase().includes(query) ||
          task.task_id.toLowerCase().includes(query) ||
          task.pic_name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (!matchesOutlet(task.outlet, selectedOutlet)) return false;
      if (!matchesStatusFilter(task, selectedStatus)) return false;
      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    );

  const filteredChecklists = checklistTasks
    .filter((checklist) => {
      if (!isWithinTimePeriod(checklist.deadline, timePeriod)) return false;

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          checklist.task_title.toLowerCase().includes(query) ||
          checklist.task_id.toLowerCase().includes(query) ||
          checklist.pic_name.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      if (!matchesOutlet(checklist.outlet, selectedOutlet)) return false;
      if (!matchesStatusFilter(checklist, selectedStatus)) return false;
      return true;
    })
    .sort(
      (a, b) =>
        new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
    );

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const hasActiveFilters =
    selectedOutlet !== "ALL" ||
    selectedStatus !== "ALL" ||
    searchQuery !== "" ||
    timePeriod !== "month";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const clearFilters = () => {
    setSelectedOutlet("ALL");
    setSelectedStatus("ALL");
    setSearchQuery("");
    setTimePeriod("month");
  };

  function scrollToList() {
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const handleStatusClick = (status: string) => {
    const mapped =
      status === "total"
        ? "ALL"
        : (status.toUpperCase() as TaskStatus | "ALL");

    if (selectedStatus === mapped) {
      setSelectedStatus("ALL");
    } else {
      setSelectedStatus(mapped);
    }

    scrollToList();
  };

  const filterPanel = (
    <div className="flex flex-wrap gap-2 rounded-lg bg-muted/50 p-3">
      <div className="flex gap-1 rounded bg-card p-1">
        <Button
          variant={timePeriod === "today" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTimePeriod("today")}
          className="text-xs"
        >
          Hari Ini
        </Button>
        <Button
          variant={timePeriod === "week" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTimePeriod("week")}
          className="text-xs"
        >
          Minggu Ini
        </Button>
        <Button
          variant={timePeriod === "month" ? "default" : "ghost"}
          size="sm"
          onClick={() => setTimePeriod("month")}
          className="text-xs"
        >
          Bulan Ini
        </Button>
      </div>

      <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
        <SelectTrigger className="w-[140px] bg-card">
          <SelectValue placeholder="Outlet" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Semua Outlet</SelectItem>
          {outlets.map((outlet) => (
            <SelectItem key={outlet} value={outlet}>
              {outlet}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedStatus}
        onValueChange={(v) => setSelectedStatus(v as TaskStatus | "ALL")}
      >
        <SelectTrigger className="w-[140px] bg-card">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground"
        >
          <X className="mr-1 size-4" />
          Reset
        </Button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader title="Dashboard" showSettings />

      <div className="mx-auto max-w-5xl space-y-4 p-4 pb-24">
        {loadError && tasks.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-start gap-3 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-600" />
              <div className="flex-1">
                <p className="text-sm text-red-800">{loadError}</p>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => loadData()}
                  className="h-auto p-0 text-red-600"
                >
                  Coba muat ulang
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Link href="/settings/recurring-tasks">
            <Card className="cursor-pointer transition-colors hover:border-primary/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <RefreshCw className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Tugas Berulang
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Template & jadwal
                  </p>
                </div>
                <ChevronRight className="ml-auto size-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/daily-reports">
            <Card className="cursor-pointer transition-colors hover:border-primary/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <ClipboardList className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Daily Activity
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Audit SOP harian
                  </p>
                </div>
                <ChevronRight className="ml-auto size-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
          <Link href="/tasks/new">
            <Card className="cursor-pointer transition-colors hover:border-primary/50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Plus className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Tugas Baru
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Buat tugas manual
                  </p>
                </div>
                <ChevronRight className="ml-auto size-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "tasks" | "checklists")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Tugas ({manualTasks.length})
            </TabsTrigger>
            <TabsTrigger value="checklists" className="flex items-center gap-2">
              <ListChecks className="size-4" />
              Checklist ({checklistTasks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4 space-y-4">
            <DashboardSummaryCards
              summary={summary}
              isLoading={isLoading}
              activeKey={activeSummaryKey}
              onStatusClick={handleStatusClick}
            />

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari tugas, ID, atau PIC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0"
              >
                <Filter className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isRefreshing || isLoading}
                className="shrink-0"
                title="Refresh data"
              >
                <RefreshCw
                  className={`size-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
              <Button size="icon" className="shrink-0" asChild>
                <Link href="/tasks/new">
                  <Plus className="size-4" />
                </Link>
              </Button>
            </div>

            {showFilters && filterPanel}

            <div ref={listRef} className="space-y-3 scroll-mt-24">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">
                  Daftar Tugas
                  {filteredTasks.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({paginatedTasks.length}/{filteredTasks.length})
                    </span>
                  )}
                </h2>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <TaskCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                    <Search className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-1 font-medium text-foreground">
                    Tidak ada tugas ditemukan
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {hasActiveFilters
                      ? "Coba ubah filter pencarian Anda"
                      : "Belum ada tugas yang dibuat"}
                  </p>
                  {hasActiveFilters ? (
                    <Button variant="outline" onClick={clearFilters}>
                      Reset Filter
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link href="/tasks/new">
                        <Plus className="mr-2 size-4" />
                        Buat Tugas Baru
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {paginatedTasks.map((task) => (
                      <TaskCard key={task.task_id} task={task} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-6 flex items-center justify-center gap-1 pb-4">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="size-8 p-0"
                          >
                            {page}
                          </Button>
                        ),
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="checklists" className="mt-4 space-y-4">
            <ChecklistSummaryCards
              summary={checklistSummary}
              isLoading={isLoading}
              activeKey={activeSummaryKey}
              onStatusClick={handleStatusClick}
            />

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cari checklist, ID, atau PIC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant={showFilters ? "secondary" : "outline"}
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
                className="shrink-0"
              >
                <Filter className="size-4" />
              </Button>
            </div>

            {showFilters && filterPanel}

            <div ref={listRef} className="space-y-3 scroll-mt-24">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">
                  Daftar Checklist
                  {hasActiveFilters && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({filteredChecklists.length} hasil)
                    </span>
                  )}
                </h2>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <TaskCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredChecklists.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                    <ListChecks className="size-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-1 font-medium text-foreground">
                    Tidak ada checklist ditemukan
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {hasActiveFilters
                      ? "Coba ubah filter pencarian Anda"
                      : "Belum ada checklist"}
                  </p>
                  {hasActiveFilters ? (
                    <Button variant="outline" onClick={clearFilters}>
                      Reset Filter
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link href="/settings/recurring-tasks">
                        <RefreshCw className="mr-2 size-4" />
                        Buat Template Recurring
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredChecklists.map((checklist) => (
                    <TaskCard key={checklist.task_id} task={checklist} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Link
        href="/tasks/new"
        className="fixed bottom-6 right-6 lg:hidden"
      >
        <Button size="lg" className="size-14 rounded-full shadow-lg">
          <Plus className="size-6" />
        </Button>
      </Link>
    </div>
  );
}
