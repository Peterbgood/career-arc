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
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResume, setFilterResume] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  const [editingJob, setEditingJob] = useState<Partial<Job> & { oldCompany?: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setLoading(true);
    jsonp(`${API_URL}?callback=callback&t=${Date.now()}`, { name: 'callback' }, (err, data) => {
      if (!err) setJobs(data);
      setLoading(false);
    });
  };

  const isFiltered = searchTerm || filterResume !== 'all' || filterType !== 'all' || filterStatus !== 'all' || filterDate;

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
        const jobDateStr = job.date.split('T')[0];
        const matchesDate = !filterDate || jobDateStr === filterDate;
        return matchesSearch && matchesResume && matchesType && matchesStatus && matchesDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [jobs, searchTerm, filterResume, filterType, filterStatus, filterDate]);

  const handleOpenModal = (job?: Job) => {
    if (job) {
      setEditingJob({ ...job, oldCompany: job.company, date: job.date.split('T')[0] });
    } else {
      const today = new Date();
      const dateStr = today.toLocaleDateString('sv-SE'); // Reliable YYYY-MM-DD
      setEditingJob({ 
        date: dateStr, 
        status: 'Applied', location: 'Remote', jobType: 'Full-time', resume: 'Frontend Developer'
      });
    }
    setIsModalOpen(true);
  };

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsModalOpen(false);
    const payload = { action: 'upsert', ...editingJob, appliedDate: editingJob?.date };
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    setTimeout(() => loadData(), 1200);
  };

  const handleDelete = async (company: string) => {
    if (deleteConfirm !== company) {
      setDeleteConfirm(company);
      setTimeout(() => setDeleteConfirm(null), 3000);
      return;
    }
    setLoading(true);
    setDeleteConfirm(null);
    const payload = { action: 'delete', company: company };
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    setTimeout(() => loadData(), 1200);
  };

  // FORCE LOCAL PARSING: This stops the "Yesterday" bug
  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const getDaysAgo = (dateStr: string) => {
    if (!dateStr) return 0;
    const today = new Date(); today.setHours(0,0,0,0);
    const applied = parseLocalDate(dateStr);
    const diff = Math.floor((today.getTime() - applied.getTime()) / 86400000);
    return diff < 0 ? 0 : diff;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-700">
      {/* Dynamic Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-400/10 blur-[120px]" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[30%] rounded-full bg-indigo-400/10 blur-[100px]" />
      </div>

      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200/60 px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-blue-200 shadow-lg">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <h1 className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">CareerArc</h1>
        </div>
        <button onClick={() => handleOpenModal()} className="hidden md:flex bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-200 active:scale-95 transition-all">
          New Application
        </button>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto p-4 md:p-8 pb-32">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Pipeline" val={jobs.length} icon="📊" />
          <StatCard label="Remote" val={jobs.filter(j => j.location === 'Remote').length} icon="🏠" />
          <StatCard label="Freelance" val={jobs.filter(j => j.jobType === 'Contract').length} icon="⚡" />
          <StatCard label="Interviews" val={jobs.filter(j => j.status === 'Interviewing').length} icon="🎯" />
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 bg-white/50 p-2 rounded-2xl border border-white shadow-sm">
          <div className="flex items-center gap-4 pl-2">
            <span className="text-sm font-semibold text-slate-500">
              Filtered <span className="text-slate-900 font-bold">{filteredJobs.length}</span>
            </span>
            {isFiltered && (
              <button onClick={resetFilters} className="text-xs px-3 py-1 bg-white border border-slate-200 rounded-full font-bold text-blue-600 shadow-sm hover:bg-blue-50 transition-all">
                Clear All
              </button>
            )}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`w-full sm:w-auto text-xs font-bold border px-6 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 ${showFilters ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
            {showFilters ? 'Apply Filters' : 'Filter List'}
          </button>
        </div>

        {/* Animated Filters */}
        {showFilters && (
          <div className="bg-white border border-slate-200 p-6 rounded-3xl mb-8 shadow-xl shadow-slate-200/50 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 animate-in slide-in-from-top-4 fade-in duration-300">
            <FilterGroup label="Company"><input type="text" placeholder="Search..." className="input-field" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></FilterGroup>
            <FilterGroup label="Resume">
              <select className="input-field" value={filterResume} onChange={e => setFilterResume(e.target.value)}>
                <option value="all">All Resumes</option><option>Frontend Developer</option><option>Business Analyst</option><option>Marketing Specialist</option>
              </select>
            </FilterGroup>
            <FilterGroup label="Job Type">
              <select className="input-field" value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="all">All Types</option><option>Full-time</option><option>Contract</option>
              </select>
            </FilterGroup>
            <FilterGroup label="Status">
              <select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option><option>Applied</option><option>Interviewing</option><option>Rejected</option>
              </select>
            </FilterGroup>
            <FilterGroup label="Date Applied"><input type="date" className="input-field" value={filterDate} onChange={e => setFilterDate(e.target.value)} /></FilterGroup>
          </div>
        )}

        {/* Job Cards */}
        <div className="space-y-4">
          {loading && jobs.length === 0 ? (
            <div className="text-center py-32 animate-pulse">
              <div className="w-12 h-12 bg-slate-200 rounded-full mx-auto mb-4" />
              <div className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Syncing Database...</div>
            </div>
          ) : 
            filteredJobs.map((job, i) => (
              <div key={i} className="group bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-bold text-slate-900 text-xl leading-none">{job.company}</h3>
                    <span className="h-4 w-[1px] bg-slate-200 hidden md:block" />
                    <p className="text-slate-500 font-semibold text-sm">{job.title}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge text={parseLocalDate(job.date).toLocaleDateString('en-US', {month:'short', day:'numeric'})} color="slate" />
                    <Badge text={`${getDaysAgo(job.date)}d ago`} color={getDaysAgo(job.date) > 7 ? 'red' : 'blue'} />
                    <Badge text={job.resume} color="indigo" />
                    <Badge text={job.jobType} color="purple" />
                    {job.salary && <Badge text={job.salary} color="emerald" />}
                    <div className={`ml-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      job.status === 'Interviewing' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      job.status === 'Rejected' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {job.status}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-center self-end md:self-center border-t md:border-none pt-4 md:pt-0 w-full md:w-auto">
                  {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="w-12 h-12 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm">↗</a>}
                  <button onClick={() => handleOpenModal(job)} className="flex-1 md:flex-none px-6 py-3 border border-slate-200 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all text-slate-700">Edit</button>
                  <button onClick={() => handleDelete(job.company)} className={`h-12 px-4 rounded-xl transition-all flex items-center justify-center gap-2 font-bold text-xs ${deleteConfirm === job.company ? 'bg-rose-600 text-white w-24' : 'text-rose-400 hover:bg-rose-50'}`}>
                    {deleteConfirm === job.company ? 'Confirm' : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>}
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      </main>

      {/* Mobile Floating Action Button */}
      <button onClick={() => handleOpenModal()} className="md:hidden fixed bottom-6 right-6 w-16 h-16 bg-slate-900 text-white rounded-full shadow-2xl flex items-center justify-center z-50 active:scale-90 transition-transform">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl my-auto border border-white/20 animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSync} className="flex flex-col max-h-[85vh]">
              <div className="px-8 py-6 flex justify-between items-center border-b border-slate-100">
                <div>
                  <h2 className="font-black text-slate-900 text-xl">{editingJob?.oldCompany ? 'Update Entry' : 'New Application'}</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Application Details</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-slate-50 text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors leading-none text-2xl">×</button>
              </div>
              <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 custom-scrollbar">
                <FilterGroup label="Date Applied"><input type="date" required value={editingJob?.date} onChange={e => setEditingJob({...editingJob, date: e.target.value})} className="input-field" /></FilterGroup>
                <FilterGroup label="Location"><select value={editingJob?.location} onChange={e => setEditingJob({...editingJob, location: e.target.value})} className="input-field"><option>Local</option><option>Remote</option></select></FilterGroup>
                <div className="md:col-span-2"><FilterGroup label="Company Name"><input type="text" required value={editingJob?.company} onChange={e => setEditingJob({...editingJob, company: e.target.value})} className="input-field" /></FilterGroup></div>
                <div className="md:col-span-2"><FilterGroup label="Job Title"><input type="text" required value={editingJob?.title} onChange={e => setEditingJob({...editingJob, title: e.target.value})} className="input-field" /></FilterGroup></div>
                <FilterGroup label="Resume Used"><select value={editingJob?.resume} onChange={e => setEditingJob({...editingJob, resume: e.target.value})} className="input-field"><option>Frontend Developer</option><option>Business Analyst</option><option>Marketing Specialist</option></select></FilterGroup>
                <FilterGroup label="Employment Type"><select value={editingJob?.jobType} onChange={e => setEditingJob({...editingJob, jobType: e.target.value})} className="input-field"><option>Full-time</option><option>Contract</option></select></FilterGroup>
                <FilterGroup label="Salary Range"><input type="text" placeholder="e.g. $120k" value={editingJob?.salary} onChange={e => setEditingJob({...editingJob, salary: e.target.value})} className="input-field" /></FilterGroup>
                <FilterGroup label="Current Status"><select value={editingJob?.status} onChange={e => setEditingJob({...editingJob, status: e.target.value})} className="input-field"><option>Applied</option><option>Interviewing</option><option>Rejected</option></select></FilterGroup>
                <div className="md:col-span-2"><FilterGroup label="Listing URL"><input type="url" value={editingJob?.url} onChange={e => setEditingJob({...editingJob, url: e.target.value})} className="input-field" /></FilterGroup></div>
              </div>
              <div className="p-8 border-t border-slate-100 bg-slate-50/50 rounded-b-[32px]">
                <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-200 active:scale-[0.98] transition-all hover:bg-blue-600 hover:shadow-blue-200 uppercase tracking-widest text-xs">Save Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const StatCard = ({ label, val, icon }: any) => (
  <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-2xl">{icon}</div>
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
  return <span className={`px-2.5 py-1 border rounded-lg text-[10px] font-bold tracking-wide ${themes[color] || themes.slate}`}>{text}</span>
};