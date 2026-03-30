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
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // For Two-Step Delete
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResume, setFilterResume] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');

  // Form State
  const [editingJob, setEditingJob] = useState<Partial<Job> & { oldCompany?: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = () => {
    setLoading(true);
    jsonp(`${API_URL}?callback=callback&t=${Date.now()}`, { name: 'callback' }, (err, data) => {
      if (!err) setJobs(data);
      setLoading(false);
    });
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchesSearch = job.company.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            job.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesResume = filterResume === 'all' || job.resume === filterResume;
      const matchesType = filterType === 'all' || job.jobType === filterType;
      const matchesStatus = filterStatus === 'all' || job.status === filterStatus;
      const matchesDate = !filterDate || job.date.split('T')[0] === filterDate;
      return matchesSearch && matchesResume && matchesType && matchesStatus && matchesDate;
    });
  }, [jobs, searchTerm, filterResume, filterType, filterStatus, filterDate]);

  const handleOpenModal = (job?: Job) => {
    setEditingJob(job ? { ...job, oldCompany: job.company } : { 
      date: new Date().toISOString().split('T')[0], 
      status: 'Applied', 
      location: 'Remote',
      jobType: 'Full-time',
      resume: 'Frontend Developer'
    });
    setIsModalOpen(true);
  };

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsModalOpen(false);
    const payload = { action: 'upsert', ...editingJob, appliedDate: editingJob?.date };
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    setTimeout(() => loadData(), 1000);
  };

  const handleDelete = async (company: string) => {
    if (deleteConfirm !== company) {
      setDeleteConfirm(company);
      setTimeout(() => setDeleteConfirm(null), 3000); // Reset after 3 seconds
      return;
    }
    
    setLoading(true);
    setDeleteConfirm(null);
    const payload = { action: 'delete', company: company };
    await fetch(API_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
    setTimeout(() => loadData(), 1000);
  };

  const getDaysAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 86400000);
    return diff < 0 ? 0 : diff;
  };

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-[#1a1a1a] font-sans antialiased">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-6 py-4 flex justify-between items-center shadow-sm">
        <h1 className="text-lg font-bold tracking-tight">🔍 CareerArc</h1>
        <button onClick={() => handleOpenModal()} className="bg-[#2563eb] text-white px-5 py-2 rounded-lg font-semibold text-sm shadow-md active:scale-95 transition-all">
          + Add Job
        </button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total" val={jobs.length} color="text-gray-900" />
          <StatCard label="Remote" val={jobs.filter(j => j.location === 'Remote').length} color="text-blue-600" />
          <StatCard label="Contract" val={jobs.filter(j => j.jobType === 'Contract').length} color="text-purple-600" />
          <StatCard label="Interviews" val={jobs.filter(j => j.status === 'Interviewing').length} color="text-emerald-600" />
        </div>

        {/* Toolbar */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500 font-medium">Showing <b>{filteredJobs.length}</b> applications</p>
          <button onClick={() => setShowFilters(!showFilters)} className={`text-xs font-bold border px-4 py-2 rounded-lg transition-all ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-300'}`}>
            Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white border border-gray-200 p-5 rounded-xl mb-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <FilterGroup label="Search"><input type="text" placeholder="Company..." className="input-field" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></FilterGroup>
              <FilterGroup label="Resume">
                <select className="input-field" value={filterResume} onChange={e => setFilterResume(e.target.value)}>
                  <option value="all">All</option>
                  <option>Frontend Developer</option><option>Business Analyst</option><option>Marketing Specialist</option>
                </select>
              </FilterGroup>
              <FilterGroup label="Type">
                <select className="input-field" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="all">All</option><option>Full-time</option><option>Contract</option>
                </select>
              </FilterGroup>
              <FilterGroup label="Status">
                <select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="all">All</option><option>Applied</option><option>Interviewing</option><option>Rejected</option>
                </select>
              </FilterGroup>
              <FilterGroup label="Date"><input type="date" className="input-field" value={filterDate} onChange={e => setFilterDate(e.target.value)} /></FilterGroup>
            </div>
          </div>
        )}

        {/* Job List */}
        <div className="space-y-2">
          {loading && jobs.length === 0 ? <div className="text-center py-20 opacity-40 font-bold uppercase tracking-widest text-xs">Syncing Data...</div> : 
            filteredJobs.map((job, i) => (
              <div key={i} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-blue-200 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-2 flex-wrap">
                    <span className="font-bold text-gray-900 text-lg">{job.company}</span>
                    <span className="text-gray-500 text-sm font-medium">{job.title}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge text={`${getDaysAgo(job.date)}d ago`} color={getDaysAgo(job.date) > 7 ? 'red' : 'gray'} />
                    <Badge text={`📄 ${job.resume}`} color="blue" />
                    <Badge text={job.jobType} color="purple" />
                    {job.salary && <Badge text={`💰 ${job.salary}`} color="green" />}
                    <Badge text={job.location} color={job.location === 'Remote' ? 'indigo' : 'emerald'} />
                    <Badge text={job.status} color={job.status === 'Interviewing' ? 'green' : job.status === 'Rejected' ? 'red' : 'yellow'} />
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  {job.url && <a href={job.url} target="_blank" rel="noreferrer" className="w-10 h-10 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all">↗</a>}
                  <button onClick={() => handleOpenModal(job)} className="px-4 py-2 border border-gray-200 text-xs font-bold rounded-lg hover:bg-gray-50 transition-all">Edit</button>
                  
                  {/* Two-Step Delete Button */}
                  <button 
                    onClick={() => handleDelete(job.company)}
                    className={`transition-all px-3 py-2 rounded-lg text-xs font-bold ${deleteConfirm === job.company ? 'bg-red-600 text-white animate-pulse' : 'text-red-400 hover:bg-red-50'}`}
                  >
                    {deleteConfirm === job.company ? 'Confirm?' : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    )}
                  </button>
                </div>
              </div>
            ))
          }
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <form onSubmit={handleSync}>
              <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
                <h2 className="font-bold text-gray-800">{editingJob?.oldCompany ? 'Update Entry' : 'New Application'}</h2>
                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 text-xl leading-none">×</button>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <FilterGroup label="Date"><input type="date" required value={editingJob?.date} onChange={e => setEditingJob({...editingJob, date: e.target.value})} className="input-field" /></FilterGroup>
                <FilterGroup label="Location"><select value={editingJob?.location} onChange={e => setEditingJob({...editingJob, location: e.target.value})} className="input-field"><option>Local</option><option>Remote</option></select></FilterGroup>
                <div className="md:col-span-2"><FilterGroup label="Company"><input type="text" required value={editingJob?.company} onChange={e => setEditingJob({...editingJob, company: e.target.value})} className="input-field" /></FilterGroup></div>
                <div className="md:col-span-2"><FilterGroup label="Title"><input type="text" required value={editingJob?.title} onChange={e => setEditingJob({...editingJob, title: e.target.value})} className="input-field" /></FilterGroup></div>
                <FilterGroup label="Resume Used"><select value={editingJob?.resume} onChange={e => setEditingJob({...editingJob, resume: e.target.value})} className="input-field"><option>Frontend Developer</option><option>Business Analyst</option><option>Marketing Specialist</option></select></FilterGroup>
                <FilterGroup label="Job Type"><select value={editingJob?.jobType} onChange={e => setEditingJob({...editingJob, jobType: e.target.value})} className="input-field"><option>Full-time</option><option>Contract</option></select></FilterGroup>
                <FilterGroup label="Salary Range"><input type="text" placeholder="e.g. $120k" value={editingJob?.salary} onChange={e => setEditingJob({...editingJob, salary: e.target.value})} className="input-field" /></FilterGroup>
                <FilterGroup label="Status"><select value={editingJob?.status} onChange={e => setEditingJob({...editingJob, status: e.target.value})} className="input-field"><option>Applied</option><option>Interviewing</option><option>Rejected</option></select></FilterGroup>
                <div className="md:col-span-2"><FilterGroup label="Application URL"><input type="url" value={editingJob?.url} onChange={e => setEditingJob({...editingJob, url: e.target.value})} className="input-field" /></FilterGroup></div>
              </div>
              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all">Save Application</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const StatCard = ({ label, val, color }: any) => (
  <div className="bg-white border border-gray-200 p-4 rounded-xl text-center shadow-sm">
    <div className={`text-2xl font-bold ${color}`}>{val}</div>
    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</div>
  </div>
);

const FilterGroup = ({ label, children }: any) => (
  <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>{children}</div>
);

const Badge = ({ text, color }: any) => {
  const themes: any = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  }
  return <span className={`px-2 py-0.5 border rounded text-[10px] font-bold uppercase whitespace-nowrap ${themes[color]}`}>{text}</span>
};