import { useState, useEffect, useMemo } from 'react'
import jsonp from 'jsonp'

interface Job {
  company: string;
  title: string;
  date: string;
  resume: string;
  jobType: string;
  salary?: string;
  location: string;
  status: string;
  url?: string;
}

const API_URL = 'https://script.google.com/macros/s/AKfycbyApDqMKCN17ubbkpHLqolVMlmN3gmnSFyTGCQP1uJcUK0vG_FGBwDMcS3ceEVpNs4O/exec';

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showTopBtn, setShowTopBtn] = useState(false); 

  const [searchTerm, setSearchTerm] = useState('');
  const [filterResume, setFilterResume] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const [editingJob, setEditingJob] = useState<Partial<Job> & { oldCompany?: string } | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setShowTopBtn(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setLoading(true);
    jsonp(`${API_URL}?callback=callback&t=${Date.now()}`, { name: 'callback' }, (err, data) => {
      if (!err) setJobs(data);
      setLoading(false);
    });
  };

  const getTodayString = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const toSheetDate = (isoDate: string) => {
    if (!isoDate) return "";
    const [y, m, d] = isoDate.split('-');
    return `${m}/${d}/${y}`;
  };

  const fromSheetDate = (dateStr: string) => {
    if (!dateStr) return getTodayString();
    if (dateStr.includes('/')) {
      const [m, d, y] = dateStr.split('/');
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return dateStr.split('T')[0];
  };

  const formatFriendlyDate = (dateStr: string) => {
    const iso = fromSheetDate(dateStr);
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getDaysAgo = (dateStr: string) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [y, m, d] = fromSheetDate(dateStr).split('-').map(Number);
    const applied = new Date(y, m - 1, d);
    const diff = Math.floor((today.getTime() - applied.getTime()) / 86400000);
    return diff < 0 ? 0 : diff;
  };

  const isFiltered = !!(searchTerm || filterResume !== 'all' || filterType !== 'all' || filterStatus !== 'all' || filterDate);

  const resetFilters = () => {
    setSearchTerm(''); setFilterResume('all'); setFilterType('all'); setFilterStatus('all'); setFilterDate('');
  };

  const filteredJobs = useMemo(() => {
    return jobs
      .filter(job => {
        const matchesSearch = job.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
          job.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesResume = filterResume === 'all' || job.resume === filterResume;
        const matchesType = filterType === 'all' || job.jobType === filterType;
        const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
        const matchesDate = !filterDate || fromSheetDate(job.date) === filterDate;
        return matchesSearch && matchesResume && matchesType && matchesStatus && matchesDate;
      })
      .sort((a, b) => fromSheetDate(b.date).localeCompare(fromSheetDate(a.date)));
  }, [jobs, searchTerm, filterResume, filterType, filterStatus, filterDate]);

  const handleOpenModal = (job?: Job) => {
    if (job) {
      setEditingJob({ ...job, oldCompany: job.company, date: fromSheetDate(job.date) });
    } else {
      setEditingJob({
        date: getTodayString(),
        status: 'Applied', location: 'Remote', jobType: 'Full-time', resume: 'Frontend Developer', salary: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsModalOpen(false);

    const sheetDate = toSheetDate(editingJob?.date || "");
    const payload = { ...editingJob, date: sheetDate, appliedDate: sheetDate, action: 'upsert' };

    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    setTimeout(() => loadData(), 1500);
  };

  const handleDelete = async (company: string) => {
    if (deleteConfirm !== company) {
      setDeleteConfirm(company);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    setLoading(true);
    setDeleteConfirm(null);
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'delete', company }) });
    setTimeout(() => loadData(), 1500);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 p-1.5 rounded-lg shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h1 className="text-xl font-black tracking-tight">CareerArc</h1>
        </div>
        <button onClick={() => handleOpenModal()} className="hidden md:block bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-600 transition-all shadow-xl">
          New Application
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 md:p-8 pb-32">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total" val={jobs.length} icon="📊" />
          <StatCard label="Remote" val={jobs.filter(j => j.location === 'Remote').length} icon="🏠" />
          <StatCard label="Contract" val={jobs.filter(j => j.jobType === 'Contract').length} icon="⚡" />
          <StatCard label="Interviews" val={jobs.filter(j => j.status === 'Interviewing').length} icon="🎯" />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white/50 p-2 rounded-2xl border border-white shadow-sm">
          <div className="flex items-center gap-4 pl-2">
            <span className="text-sm font-semibold text-slate-500">Results: <span className="text-slate-900 font-bold">{filteredJobs.length}</span></span>
            {isFiltered && <button onClick={resetFilters} className="text-xs px-3 py-1 bg-white border border-slate-200 rounded-full font-bold text-blue-600">Reset</button>}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`w-full sm:w-auto text-xs font-bold border px-6 py-2.5 rounded-xl transition-all ${showFilters ? 'bg-slate-900 text-white' : 'bg-white text-slate-600'}`}>
            Filters {showFilters ? '▲' : '▼'}
          </button>
        </div>

        {showFilters && (
          <div className="bg-white border border-slate-200 p-6 rounded-3xl mb-8 shadow-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <FilterGroup label="Search"><input type="text" placeholder="Company..." className="input-field" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></FilterGroup>
            <FilterGroup label="Resume"><select className="input-field" value={filterResume} onChange={e => setFilterResume(e.target.value)}><option value="all">All Resumes</option><option>Frontend Developer</option><option>Business Analyst</option><option>Marketing Specialist</option></select></FilterGroup>
            <FilterGroup label="Type"><select className="input-field" value={filterType} onChange={e => setFilterType(e.target.value)}><option value="all">All Types</option><option>Full-time</option><option>Part-time</option><option>Contract</option></select></FilterGroup>
            {/* ADDED: Ghosted to Filter */}
            <FilterGroup label="Status"><select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="all">All Status</option><option>Applied</option><option>Interviewing</option><option>Rejected</option><option>Ghosted</option></select></FilterGroup>
            <FilterGroup label="Date">
              <input
                type="date"
                className="input-field w-full"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
              />
            </FilterGroup>
          </div>
        )}

        <div className="space-y-4">
          {loading && jobs.length === 0 ? (
            <div className="text-center py-32 opacity-50 font-black uppercase tracking-widest text-xs">Syncing Database...</div>
          ) :
            filteredJobs.map((job, i) => (
              <div key={i} className="group bg-white border border-slate-200 p-5 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-bold text-slate-900 text-xl leading-none">{job.company}</h3>
                    <p className="text-slate-400 font-semibold text-sm">/ {job.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge text={formatFriendlyDate(job.date)} color="slate" />
                    <Badge text={`${getDaysAgo(job.date)}d ago`} color={getDaysAgo(job.date) > 7 ? 'red' : 'blue'} />
                    <Badge text={job.jobType} color="emerald" />
                    {job.salary && <Badge text={job.salary} color="purple" />}
                    <Badge text={job.resume} color="indigo" />
                    
                    {/* UPDATED: Status Badge Logic for Ghosted */}
                    <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      job.status === 'Interviewing' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      job.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                      job.status === 'Ghosted' ? 'bg-slate-100 text-slate-500 border-slate-200' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {job.status}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center w-full md:w-auto border-t md:border-none pt-4 md:pt-0">
                  {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 transition-all shadow-sm">↗</a>}
                  <button onClick={() => handleOpenModal(job)} className="flex-1 md:flex-none px-6 py-3 border border-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all">Edit</button>
                  <button onClick={() => handleDelete(job.company)} className={`h-12 px-4 rounded-xl transition-all font-bold text-xs ${deleteConfirm === job.company ? 'bg-rose-600 text-white' : 'text-rose-400 hover:bg-rose-50'}`}>{deleteConfirm === job.company ? 'Confirm' : 'Del'}</button>
                </div>
              </div>
            ))
          }
        </div>
      </main>

      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {showTopBtn && (
          <button
            onClick={scrollToTop}
            className="w-12 h-12 bg-white border border-slate-200 text-slate-900 rounded-full shadow-2xl flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 duration-300 hover:bg-slate-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" /></svg>
          </button>
        )}

        <button onClick={() => handleOpenModal()} className="md:hidden w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl my-auto">
            <form onSubmit={handleSync} className="flex flex-col max-h-[85vh]">
              <div className="px-8 py-6 flex justify-between items-center border-b border-slate-100">
                <h2 className="font-black text-slate-900 text-xl">{editingJob?.oldCompany ? 'Update' : 'New Entry'}</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 text-2xl leading-none p-2">×</button>
              </div>
              <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                <FilterGroup label="Date Applied">
                  <div className="flex gap-2">
                    <input type="date" required value={editingJob?.date} onChange={e => setEditingJob({ ...editingJob, date: e.target.value })} className="input-field flex-1" />
                    <button type="button" onClick={() => setEditingJob({ ...editingJob, date: getTodayString() })} className="bg-slate-100 px-3 rounded-xl text-[10px] font-black hover:bg-blue-100 transition-colors">Today</button>
                  </div>
                </FilterGroup>
                <FilterGroup label="Location"><select value={editingJob?.location} onChange={e => setEditingJob({ ...editingJob, location: e.target.value })} className="input-field"><option>Local</option><option>Remote</option></select></FilterGroup>
                <div className="md:col-span-2"><FilterGroup label="Company Name"><input type="text" required value={editingJob?.company} onChange={e => setEditingJob({ ...editingJob, company: e.target.value })} className="input-field" /></FilterGroup></div>
                <div className="md:col-span-2"><FilterGroup label="Job Title"><input type="text" required value={editingJob?.title} onChange={e => setEditingJob({ ...editingJob, title: e.target.value })} className="input-field" /></FilterGroup></div>
                <FilterGroup label="Resume Used"><select value={editingJob?.resume} onChange={e => setEditingJob({ ...editingJob, resume: e.target.value })} className="input-field"><option>Frontend Developer</option><option>Business Analyst</option><option>Marketing Specialist</option></select></FilterGroup>
                <FilterGroup label="Job Type"><select value={editingJob?.jobType} onChange={e => setEditingJob({ ...editingJob, jobType: e.target.value })} className="input-field"><option>Full-time</option><option>Part-time</option><option>Contract</option></select></FilterGroup>
                <FilterGroup label="Salary"><input type="text" value={editingJob?.salary} onChange={e => setEditingJob({ ...editingJob, salary: e.target.value })} className="input-field" /></FilterGroup>
                {/* ADDED: Ghosted to Modal Select */}
                <FilterGroup label="Status"><select value={editingJob?.status} onChange={e => setEditingJob({ ...editingJob, status: e.target.value })} className="input-field"><option>Applied</option><option>Interviewing</option><option>Rejected</option><option>Ghosted</option></select></FilterGroup>
                <div className="md:col-span-2"><FilterGroup label="Listing URL"><input type="url" value={editingJob?.url} onChange={e => setEditingJob({ ...editingJob, url: e.target.value })} className="input-field" /></FilterGroup></div>
              </div>
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 rounded-b-[32px]">
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-lg">Save Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const StatCard = ({ label, val, icon }: any) => (
  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm relative group overflow-hidden">
    <div className="absolute top-0 right-0 p-4 opacity-10 text-2xl">{icon}</div>
    <div className="text-3xl font-black text-slate-900">{val}</div>
    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</div>
  </div>
);

const FilterGroup = ({ label, children }: any) => (
  <div className="flex flex-col gap-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>{children}</div>
);

const Badge = ({ text, color }: any) => {
  const themes: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    red: 'bg-rose-50 text-rose-600 border-rose-100',
  }
  return <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-bold ${themes[color] || themes.slate}`}>{text}</span>
};