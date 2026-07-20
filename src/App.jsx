import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ggLogo from './assets/GG_logo.png';
import umautoImg from './assets/umauto.jpg';

// --- SUPABASE CLIENT CONFIGURATION ---
const SUPABASE_URL = 'https://bhknqvfgchhnklogsvoq.supabase.co'; 
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_w4v6rE6JD85riM6KMr2SFg_BlGAugtC';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// --- ICONS ---
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);

// --- PASSWORD GENERATOR ---
const generateDailyPassword = () => {
    // We lock the React app to the exact same timezone as the Discord bot
    // Now they will ALWAYS generate the exact same password without needing to share files!
    const localTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Makassar" });
    const date = new Date(localTimeString);
    
    const seed = (date.getFullYear() * 10000) + ((date.getMonth() + 1) * 100) + date.getDate();
    const words = ['Carrot', 'Derby', 'Turf', 'Paca', 'Aoharu', 'URA', 'Spica', 'Sirius', 'G1'];
    const word = words[seed % words.length];
    
    return `${word}${seed % 99}`;
};

export default function App() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMainTab, setActiveMainTab] = useState('Umamusume');
  const [activeUmaTab, setActiveUmaTab] = useState('Canon'); 
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  
  const [editingId, setEditingId] = useState(null); 
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, entryId: null, dbTable: null, ui_id: null, password: '', error: '' });
  
  const [formData, setFormData] = useState({
    category: 'Umamusume',
    name: '', link: '', submitter: '', imageBase64: '',
    type: 'Canon', dorm: 'Ritto', trainer: '', roommate: '', team: '',
    trainerRole: 'Head Trainer', season: '',
    password: ''
  });
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const availableTeams = entries.filter(e => e.category === 'Team').map(e => e.name);

  // --- 1. FETCH DATA ---
  const fetchEntries = async () => {
    setLoading(true);
    try {
      // ✅ FIX: Fetching sequentially prevents Postgres statement timeouts caused by large Base64 payloads
      const charsRes = await supabase.from('characters').select('*');
      if (charsRes.error) throw charsRes.error;

      const teamsRes = await supabase.from('teams').select('*');
      if (teamsRes.error) throw teamsRes.error;

      const trainersRes = await supabase.from('trainers').select('*');
      if (trainersRes.error) throw trainersRes.error;

      const npcsRes = await supabase.from('npcs').select('*');
      if (npcsRes.error) throw npcsRes.error;

      const rivalsRes = await supabase.from('rivals').select('*');
      if (rivalsRes.error) throw rivalsRes.error;

      // Notice the fallback to 'Unassigned' if data is missing
      const unified = [
        ...(charsRes.data || []).map(e => ({ ...e, ui_id: `char-${e.id}`, _table: 'characters', category: 'Umamusume', trainer: e.trainer_name, team: e.team_name, type: e.type || 'Unassigned', dorm: e.dorm || 'Unassigned' })),
        ...(teamsRes.data || []).map(e => ({ ...e, ui_id: `team-${e.id}`, _table: 'teams', category: 'Team' })),
        ...(trainersRes.data || []).map(e => ({ ...e, ui_id: `trn-${e.id}`, _table: 'trainers', category: 'Trainer', submitter: e.discord_submitter, team: e.team_name, trainerRole: e.position })),
        ...(npcsRes.data || []).map(e => ({ ...e, ui_id: `npc-${e.id}`, _table: 'npcs', category: 'NPC' })),
        ...(rivalsRes.data || []).map(e => ({ ...e, ui_id: `riv-${e.id}`, _table: 'rivals', category: 'Rival' }))
      ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      setEntries(unified);
    } catch (err) {
      console.error('Error fetching data from Supabase:', err.message);
      setErrorMsg('Failed to fetch data from live database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, imageBase64: reader.result }));
      reader.readAsDataURL(file);
    }
  };

  const handleEditClick = (entry) => {
    setFormData({
      category: entry.category,
      name: entry.name || '', link: entry.link || '', submitter: entry.submitter || '', imageBase64: entry.image || '',
      type: entry.type || 'Unassigned', dorm: entry.dorm || 'Unassigned', trainer: entry.trainer || '', roommate: entry.roommate || '', team: entry.team || '',
      trainerRole: entry.trainerRole || 'Head Trainer', season: entry.season || '',
      password: '' 
    });
    setEditingId(entry.ui_id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(prev => ({ ...prev, name: '', link: '', submitter: '', imageBase64: '', trainer: '', roommate: '', team: '', season: '', trainerRole: 'Head Trainer', password: '' }));
    const fileInput = document.getElementById('file-upload');
    if (fileInput) fileInput.value = '';
    setErrorMsg('');
  };

  const confirmDelete = async () => {
    const currentDailyPassword = generateDailyPassword();

    if (deleteModal.password !== currentDailyPassword) {
      setDeleteModal(prev => ({ ...prev, error: 'Invalid Password of the Day.' }));
      return;
    }

    try {
      const { error } = await supabase
        .from(deleteModal.dbTable)
        .delete()
        .eq('id', deleteModal.entryId);

      if (error) throw error;

      setEntries(entries.filter(e => e.ui_id !== deleteModal.ui_id));
      if (selectedTeamId === deleteModal.ui_id) setSelectedTeamId(null);
      setDeleteModal({ isOpen: false, entryId: null, dbTable: null, ui_id: null, password: '', error: '' });
      setSuccessMsg('Entry deleted from database successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Error deleting from database:', err.message);
      setDeleteModal(prev => ({ ...prev, error: 'Failed to delete row from database.' }));
    }
  };

  // --- 3. MULTI-TABLE INSERT / UPDATE ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');

    const currentDailyPassword = generateDailyPassword();

    if (formData.password !== currentDailyPassword) {
      setErrorMsg('Invalid Password of the Day.');
      return;
    }

    let targetTable = 'characters';
    let dbPayload = {};

    switch (formData.category) {
      case 'Umamusume':
        targetTable = 'characters';
        dbPayload = { category: 'Umamusume', name: formData.name, link: formData.link, submitter: formData.submitter, image: formData.imageBase64, type: formData.type, dorm: formData.dorm, trainer_name: formData.trainer || 'None', roommate: formData.roommate || 'None', team_name: formData.team || '' };
        break;
      case 'Team':
        targetTable = 'teams';
        dbPayload = { name: formData.name, image: formData.imageBase64, link: formData.link };
        break;
      case 'Trainer':
        targetTable = 'trainers';
        dbPayload = { name: formData.name, team_name: formData.team || '', discord_submitter: formData.submitter, position: formData.trainerRole, image: formData.imageBase64, link: formData.link }; 
        break;
      case 'NPC':
        targetTable = 'npcs';
        dbPayload = { name: formData.name, submitter: formData.submitter, image: formData.imageBase64, link: formData.link }; 
        break;
      case 'Rival':
        targetTable = 'rivals';
        dbPayload = { name: formData.name, season: formData.season || 'General', image: formData.imageBase64, link: formData.link };
        break;
      default:
        break;
    }

    try {
      if (editingId) {
        const existingEntry = entries.find(e => e.ui_id === editingId);
        const { error } = await supabase
          .from(existingEntry._table)
          .update(dbPayload)
          .eq('id', existingEntry.id);

        if (error) throw error;
        
        await fetchEntries();
        setSuccessMsg('Entry updated successfully inside database!');
        setEditingId(null);
      } else {
        const { data, error } = await supabase
          .from(targetTable)
          .insert([dbPayload])
          .select();

        if (error) throw error;
        await fetchEntries();
        setSuccessMsg(`${formData.name} added directly to database!`);
      }

      setFormData(prev => ({ ...prev, name: '', link: '', submitter: '', imageBase64: '', trainer: '', roommate: '', team: '', season: '', password: '' }));
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Database Operation Error:', err.message);
      setErrorMsg(`Failed to save entry: ${err.message}`);
    }
  };

  const AdminControls = ({ entry }) => (
    <div className="absolute top-2 right-2 flex gap-1 bg-white/90 p-1 rounded-lg border border-slate-200 backdrop-blur shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
      <button onClick={(e) => { e.stopPropagation(); handleEditClick(entry); }} className="p-1.5 text-blue-600 hover:text-blue-500 hover:bg-slate-100 rounded transition-colors" title="Edit">
        <EditIcon />
      </button>
      <button onClick={(e) => { e.stopPropagation(); setDeleteModal({isOpen: true, entryId: entry.id, dbTable: entry._table, ui_id: entry.ui_id, password: '', error: ''}); }} className="p-1.5 text-red-500 hover:text-red-400 hover:bg-slate-100 rounded transition-colors" title="Delete">
        <TrashIcon />
      </button>
    </div>
  );

  const getAccentColor = (entry) => {
    if (entry.category === 'Umamusume') return entry.type === 'Canon' ? 'bg-[#ff4da6]' : (entry.type === 'OC' ? 'bg-[#00d182]' : 'bg-[#8b5cf6]');
    if (entry.category === 'Trainer') return 'bg-[#ffb800]';
    if (entry.category === 'Rival') return 'bg-[#ff3b3b]';
    if (entry.category === 'NPC') return 'bg-[#1942d8]';
    return 'bg-[#8b5cf6]';
  };

  const renderCard = (entry) => (
    <div key={entry.ui_id} className="relative group bg-white border-2 border-slate-100 rounded-xl shadow hover:shadow-lg hover:-translate-y-1 transition-all overflow-hidden flex flex-row h-40">
      <AdminControls entry={entry} />
      <div className={`w-3 shrink-0 ${getAccentColor(entry)}`} />
      <div className="w-32 h-full shrink-0 bg-slate-100 border-r-2 border-slate-100 flex items-center justify-center overflow-hidden">
        {entry.image ? <img src={entry.image} alt={entry.name} className="w-full h-full object-cover object-top" /> : <span className="text-slate-400 text-xs font-bold text-center px-2">No Image</span>}
      </div>
      <div className="flex flex-col justify-between flex-grow p-3 text-sm pr-8">
        <div>
            <div className="text-lg font-black italic text-slate-800 leading-tight mb-1">{entry.name}</div>
            {entry.category === 'Umamusume' && (
                <>
                {entry.team && <div className="text-[#1942d8] font-bold italic text-xs">{entry.team}</div>}
                <div className="text-slate-500 text-xs mt-1"><span className="font-bold">Roommate:</span> {entry.roommate}</div>
                </>
            )}
            {entry.category === 'Trainer' && (
                <div className="text-[#ffb800] font-bold italic text-xs">Team: {entry.team || 'Independent'}</div>
            )}
            {entry.category === 'Rival' && <div className="text-[#ff3b3b] font-bold italic text-xs">Season: {entry.season}</div>}
            {entry.category === 'NPC' && <div className="text-[#1942d8] font-bold italic text-xs">General NPC</div>}
        </div>
        <div className="flex flex-col gap-1 mt-2">
            {entry.submitter && <div className="text-xs text-slate-500 font-bold">Owner: <span className="text-slate-700">{entry.submitter}</span></div>}
            {entry.link && (
              <a href={entry.link} target="_blank" rel="noopener noreferrer" className="inline-block text-center bg-[#1942d8] hover:bg-[#3b72ff] text-white text-xs font-bold italic py-1.5 px-3 rounded transition-colors shadow">
                  View Sheet
              </a>
            )}
        </div>
      </div>
    </div>
  );

  const renderTeamMemberCard = (member, roleLabel) => (
    <div key={member.ui_id} className="relative group flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-3 rounded-xl border-2 border-slate-100 hover:border-[#1942d8] transition-colors shadow-sm">
        <AdminControls entry={member} />
        <div className="w-20 h-20 shrink-0 bg-slate-100 border-2 border-slate-200 rounded-lg overflow-hidden flex items-center justify-center">
            {member.image ? <img src={member.image} className="w-full h-full object-cover object-top"/> : <span className="text-slate-400 text-xs font-bold text-center px-1">No Pic</span>}
        </div>
        <div className="flex flex-col justify-center pr-8">
            <span className="text-xs font-bold tracking-wider text-[#ff4da6] uppercase mb-0.5">{roleLabel}</span>
            <span className="text-lg font-black italic text-slate-800">{member.name}</span>
            {member.submitter && <div className="text-slate-500 mt-1 text-xs font-bold">Owner: <span className="text-slate-700">{member.submitter}</span></div>}
        </div>
    </div>
  );

  const EmptyMemberPlaceholder = ({ roleLabel }) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-3 rounded-xl border-2 border-dashed border-slate-200 opacity-70">
        <div className="w-20 h-20 shrink-0 bg-slate-200/50 border-2 border-slate-200 rounded-lg"></div>
        <div className="flex flex-col justify-center">
            <span className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-0.5">{roleLabel}</span>
            <span className="text-lg font-black italic text-slate-400">Empty position</span>
        </div>
    </div>
  );

  const renderGallery = () => {
    if (activeMainTab === 'Teams') {
      const teamEntries = entries.filter(e => e.category === 'Team');
      const selectedTeam = teamEntries.find(e => e.ui_id === selectedTeamId) || teamEntries[0];

      if (teamEntries.length === 0) return <div className="text-center py-20 text-slate-500"><p className="text-xl font-black italic">No Teams created yet.</p></div>;

      const teamMembers = selectedTeam ? entries.filter(e => e.team === selectedTeam.name && e.category !== 'Team') : [];
      const headTrainers = teamMembers.filter(e => e.category === 'Trainer' && e.trainerRole === 'Head Trainer');
      const assistantTrainers = teamMembers.filter(e => e.category === 'Trainer' && e.trainerRole === 'Assistant Trainer');
      const trainees = teamMembers.filter(e => e.category === 'Umamusume');

      return (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <h3 className="text-xl font-black italic text-slate-800 mb-2 px-2 border-l-4 border-[#1942d8]">Registered Teams</h3>
            <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 hide-scrollbar">
              {teamEntries.map(team => (
                <div key={team.ui_id} onClick={() => setSelectedTeamId(team.ui_id)} className={`relative group shrink-0 w-40 lg:w-full p-3 border-2 ${selectedTeam?.ui_id === team.ui_id ? 'border-[#1942d8] bg-blue-50/50 shadow-md' : 'border-slate-100 bg-white hover:border-slate-300'} rounded-xl cursor-pointer transition-all flex flex-col items-center`}>
                  <AdminControls entry={team} />
                  <div className="w-full aspect-square bg-slate-100 mb-3 overflow-hidden flex items-center justify-center rounded-lg border-2 border-slate-200">
                    {team.image ? <img src={team.image} className="w-full h-full object-cover"/> : <span className="text-slate-400 font-bold text-sm">No Logo</span>}
                  </div>
                  <div className="font-black italic text-center text-slate-800 text-base">{team.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-2/3">
            {selectedTeam ? (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-8 border-[#1942d8]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 pb-4 border-b-2 border-slate-100 gap-4">
                  <h2 className="text-2xl font-black italic text-slate-800 flex items-center gap-3">
                    {selectedTeam.name}
                  </h2>
                  {selectedTeam.link && (
                    <a href={selectedTeam.link} target="_blank" rel="noopener noreferrer" className="shrink-0 bg-[#ff4da6] hover:bg-[#ff7ebf] text-white font-bold italic py-2 px-6 rounded-full transition-colors shadow-md">Mastersheet Link</a>
                  )}
                </div>
                <div className="flex flex-col gap-6">
                  <div className="space-y-3">
                    {headTrainers.length > 0 ? headTrainers.map(m => renderTeamMemberCard(m, 'Head Trainer')) : <EmptyMemberPlaceholder roleLabel="Head Trainer" />}
                  </div>
                  <div className="space-y-3">
                    {assistantTrainers.length > 0 ? assistantTrainers.map(m => renderTeamMemberCard(m, 'Assistant Trainer')) : <EmptyMemberPlaceholder roleLabel="Assistant Trainer" />}
                  </div>
                  <div className="space-y-3">
                    {trainees.length > 0 ? trainees.map(m => renderTeamMemberCard(m, 'Umamusume Trainee')) : <EmptyMemberPlaceholder roleLabel="Umamusume Trainee" />}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    const categoryEntries = entries.filter(e => e.category === activeMainTab);
    
    if (activeMainTab === 'Umamusume') {
      const typeFiltered = categoryEntries.filter(e => e.type === activeUmaTab);
      return (
        <div>
          <div className="flex mb-6 space-x-2 border-b-2 border-slate-200 pb-0">
            <button onClick={() => setActiveUmaTab('Canon')} className={`px-6 py-3 rounded-t-lg font-black italic text-lg transition-colors -mb-0.5 ${activeUmaTab === 'Canon' ? 'bg-[#ff4da6] text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>Canon Roster</button>
            <button onClick={() => setActiveUmaTab('OC')} className={`px-6 py-3 rounded-t-lg font-black italic text-lg transition-colors -mb-0.5 ${activeUmaTab === 'OC' ? 'bg-[#00d182] text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>Original Characters</button>
            <button onClick={() => setActiveUmaTab('Unassigned')} className={`px-6 py-3 rounded-t-lg font-black italic text-lg transition-colors -mb-0.5 ${activeUmaTab === 'Unassigned' ? 'bg-[#8b5cf6] text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>Unassigned / Needs Edit</button>
          </div>
          {['Ritto', 'Miho', 'Independent', 'Unassigned'].map(dorm => {
            const group = typeFiltered.filter(e => e.dorm === dorm);
            if (group.length === 0) return null;
            return (
              <div key={dorm} className="mb-10">
                <h3 className="text-2xl font-black italic text-slate-800 pb-2 mb-4 flex items-center gap-2">
                    <span className={`w-4 h-8 inline-block -skew-x-12 ${dorm === 'Unassigned' ? 'bg-[#8b5cf6]' : 'bg-[#1942d8]'}`}></span>
                    {dorm} {dorm !== 'Independent' && dorm !== 'Unassigned' && 'Dorm'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{group.map(renderCard)}</div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeMainTab === 'Trainer') {
      const teams = [...new Set(categoryEntries.map(e => e.team || 'Independent'))].sort();
      return teams.map(team => {
        const group = categoryEntries.filter(e => (e.team || 'Independent') === team);
        return (
          <div key={team} className="mb-10">
            <h3 className="text-2xl font-black italic text-slate-800 pb-2 mb-4 flex items-center gap-2">
                <span className="w-4 h-8 bg-[#ffb800] inline-block -skew-x-12"></span>
                {team}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">{group.map(renderCard)}</div>
          </div>
        );
      });
    }

    if (['Rival', 'NPC'].includes(activeMainTab)) {
      const colorMap = { 'Rival': 'bg-[#ff3b3b]', 'NPC': 'bg-[#1942d8]' };
      return (
        <div className="mb-10">
          <h3 className={`text-2xl font-black italic text-slate-800 pb-2 mb-4 flex items-center gap-2`}>
             <span className={`w-4 h-8 inline-block -skew-x-12 ${colorMap[activeMainTab]}`}></span>
             Registered {activeMainTab}s
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">{categoryEntries.map(renderCard)}</div>
        </div>
      ); 
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] font-sans pb-12 pt-24 relative">
      
      <header className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-[#1942d8] to-[#3b72ff] z-50 flex items-center justify-between px-4 sm:px-8 shadow-md border-b-4 border-[#122b94]">
        <div className="flex items-center gap-4">
          <div className="h-10 flex items-center justify-center">
            <img 
              src={ggLogo} 
              alt="GG Database Logo" 
              className="h-9 w-auto object-contain select-none pointer-events-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]" 
            />
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <a href="#" className="px-3 sm:px-6 py-1.5 bg-white text-[#1942d8] font-bold italic rounded shadow-[2px_2px_0px_#122b94] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_#122b94] transition-all text-xs sm:text-base">
            Mastersheet
          </a>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8 px-4 sm:px-6">
        
        <div className="lg:col-span-1">
          <div className={`bg-white p-6 rounded-xl shadow-lg border-t-8 ${editingId ? 'border-[#00d182]' : 'border-[#1942d8]'} sticky top-24 transition-colors`}>
            <h2 className={`text-2xl font-black italic mb-6 pb-2 border-b-2 flex items-center gap-2 ${editingId ? 'text-[#00d182] border-green-100' : 'text-[#1942d8] border-blue-100'}`}>
              <span className={`w-3 h-6 inline-block -skew-x-12 ${editingId ? 'bg-[#00d182]' : 'bg-[#1942d8]'}`}></span>
              {editingId ? 'Edit Entry' : 'Database Input'}
            </h2>
            
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded flex items-center gap-3 shadow-inner">
                <img src={umautoImg} alt="Welcome Mascot" className="w-10 h-10 object-contain shrink-0 rounded" />
                <span className="font-bold text-sm text-blue-800">Welcome to Grand Gallop's Mastersheet, Have a nice read!</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Entry Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange} disabled={!!editingId} className="w-full bg-slate-50 border-2 border-slate-200 rounded p-2 text-slate-800 font-bold focus:border-[#1942d8] outline-none disabled:opacity-50">
                  <option value="Umamusume">Umamusume</option>
                  <option value="Team">Team / Faction</option>
                  <option value="Trainer">Trainer</option>
                  <option value="NPC">General NPC</option>
                  <option value="Rival">Rival / Enemy</option>
                </select>
              </div>

              <div className="p-4 bg-slate-50 rounded border-2 border-slate-100 space-y-3">
                {formData.category === 'Umamusume' && (
                  <>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Type</label>
                        <select name="type" value={formData.type} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded p-2 text-sm text-slate-700 font-medium">
                          <option value="Canon">Canon</option>
                          <option value="OC">OC</option>
                          <option value="Unassigned">Unassigned</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dormitory</label>
                        <select name="dorm" value={formData.dorm} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded p-2 text-sm text-slate-700 font-medium">
                          <option value="Ritto">Ritto</option>
                          <option value="Miho">Miho</option>
                          <option value="Independent">Independent</option>
                          <option value="Unassigned">Unassigned</option>
                        </select>
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Affiliated Team</label>
                      <select name="team" value={formData.team} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded p-2 text-sm text-slate-700 font-medium">
                        <option value="">None / Independent</option>
                        {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Current Trainer</label>
                      <input type="text" name="trainer" placeholder="e.g. Trainer Aki" value={formData.trainer} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded p-2 text-sm text-slate-700 font-medium" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Roommate</label>
                      <input type="text" name="roommate" placeholder="e.g. Special Week" value={formData.roommate} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded p-2 text-sm text-slate-700 font-medium" />
                    </div>
                  </>
                )}
                {formData.category === 'Trainer' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Role</label>
                      <select name="trainerRole" value={formData.trainerRole} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded p-2 text-sm text-slate-700 font-medium">
                        <option value="Head Trainer">Head Trainer</option>
                        <option value="Assistant Trainer">Assistant Trainer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Affiliated Team</label>
                      <select name="team" value={formData.team} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded p-2 text-sm text-slate-700 font-medium">
                        <option value="">None / Independent</option>
                        {availableTeams.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                {formData.category === 'Rival' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Season / Arc</label>
                    <input type="text" name="season" placeholder="e.g. URA Finals" value={formData.season} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded p-2 text-sm text-slate-700 font-medium" />
                  </div>
                )}
              </div>

              <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{formData.category === 'Team' ? 'Team Name' : 'Character Name'}</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full bg-white border-2 border-slate-200 rounded p-2 text-slate-800 font-medium focus:border-[#1942d8] outline-none" /></div>
              
              {/* Only show Submitter and Link if the schema supports it for the current category */}
              {['Umamusume', 'Trainer', 'NPC'].includes(formData.category) && (
                  <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Discord Owner / Submitter</label><input type="text" name="submitter" value={formData.submitter} onChange={handleInputChange} className="w-full bg-white border-2 border-slate-200 rounded p-2 text-slate-800 font-medium focus:border-[#1942d8] outline-none" /></div>
              )}
              {['Umamusume', 'Team', 'Trainer', 'NPC', 'Rival'].includes(formData.category) && (
                  <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Google Doc / Source Link</label><input type="url" name="link" value={formData.link} onChange={handleInputChange} className="w-full bg-white border-2 border-slate-200 rounded p-2 text-slate-800 font-medium focus:border-[#1942d8] outline-none" /></div>
              )}
              
              {/* Image upload is now available globally */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Image / Logo Upload</label>
                <div className="flex items-center gap-3">
                  {formData.imageBase64 && (
                    <div className="w-10 h-10 shrink-0 bg-slate-100 rounded border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center">
                      <img src={formData.imageBase64} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} className="w-full bg-white border-2 border-slate-200 rounded p-1 text-slate-600 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                </div>
              </div>

              <div className="pt-4 border-t-2 border-slate-100">
                <label className="block text-xs font-bold text-[#ff4da6] uppercase tracking-wider mb-1">Daily Password</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} required className="w-full bg-white border-2 border-pink-200 rounded p-2 text-slate-800 font-medium focus:border-[#ff4da6] outline-none" />
              </div>

              {errorMsg && <p className="text-[#ff3b3b] text-sm mt-2 font-bold">{errorMsg}</p>}
              {successMsg && <p className="text-[#00d182] text-sm mt-2 font-bold">{successMsg}</p>}

              <div className="flex gap-3 mt-6">
                {editingId && (
                  <button type="button" onClick={handleCancelEdit} className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black italic py-3 px-4 rounded transition-colors shadow">
                    Cancel
                  </button>
                )}
                <button type="submit" className={`${editingId ? 'w-2/3 bg-[#00d182] hover:bg-[#00b06d]' : 'w-full bg-[#1942d8] hover:bg-[#3b72ff]'} text-white font-black italic py-3 px-4 rounded transition-colors shadow-md text-lg`}>
                  {editingId ? 'Update Entry' : 'Upload Data'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-lg border-2 border-slate-100 h-[calc(100vh-100px)] overflow-hidden flex flex-col">
            
            {/* Added shrink-0 here to fix the squishing issue */}
            <div className="shrink-0 flex bg-[#f8f9fc] border-b-4 border-slate-200 overflow-x-auto hide-scrollbar w-full sticky top-0 z-20">
              {['Umamusume', 'Teams', 'Trainer', 'NPC', 'Rival'].map(tab => {
                const colorMap = { 'Umamusume': '#ff4da6', 'Teams': '#8b5cf6', 'Trainer': '#ffb800', 'NPC': '#1942d8', 'Rival': '#ff3b3b' };
                const color = colorMap[tab];
                const isActive = activeMainTab === tab;
                return (
                  <button 
                    key={tab}
                    onClick={() => { setActiveMainTab(tab); }} 
                    className={`flex-[1_0_120px] px-2 py-4 text-center whitespace-nowrap text-lg font-black italic transition-all border-b-4 -mb-1
                    ${isActive ? `bg-white text-slate-800` : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
                    style={isActive ? { borderBottomColor: color } : {}}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="p-6 sm:p-8 bg-slate-50/50 flex-grow overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#1942d8]"></div>
                </div>
              ) : (
                <>
                  {renderGallery()}
                  {entries.filter(e => e.category === activeMainTab).length === 0 && activeMainTab !== 'Teams' && (
                    <div className="text-center py-20 text-slate-400"><p className="text-2xl font-black italic">No entries yet for this category.</p></div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white p-6 rounded-xl border-t-8 border-[#ff3b3b] shadow-2xl w-full max-w-md">
                <h3 className="text-2xl font-black italic text-slate-800 mb-2 flex items-center gap-2">
                    <span className="w-3 h-6 bg-[#ff3b3b] inline-block -skew-x-12"></span>
                    Confirm Deletion
                </h3>
                <p className="text-sm text-slate-600 mb-6 font-medium">Are you sure you want to permanently delete this entry? This action cannot be undone.</p>
                <label className="block text-xs font-bold text-[#ff4da6] uppercase tracking-wider mb-1">Authorize (Daily Password)</label>
                <input
                    type="password"
                    placeholder="Enter today's password"
                    value={deleteModal.password}
                    onChange={e => setDeleteModal({...deleteModal, password: e.target.value})}
                    className="w-full bg-slate-50 border-2 border-slate-200 focus:border-[#ff3b3b] outline-none rounded p-3 text-slate-800 mb-2 font-bold"
                />
                {deleteModal.error && <p className="text-[#ff3b3b] text-sm mb-4 font-bold">{deleteModal.error}</p>}
                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={() => setDeleteModal({isOpen: false, entryId: null, dbTable: null, ui_id: null, password: '', error: ''})} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-black italic transition-colors">Cancel</button>
                    <button onClick={confirmDelete} className="px-5 py-2 bg-[#ff3b3b] hover:bg-red-600 text-white rounded font-black italic transition-colors shadow-md">Permanently Delete</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}