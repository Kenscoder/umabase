import React, { useState, useEffect, useRef } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { loginRequest } from './authConfig';
import ggLogo from './assets/GG_logo.png';
import umautoImg from './assets/umauto.jpg';

// --- ICONS ---
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
);
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);

// --- SEASON SORTING (Rivals tab) ---
// Sorts "Season 0", "Season 1", "Season 2"... numerically ascending. Any non-numeric
// labels (e.g. "URA Finals") fall to the end, alphabetically among themselves.
const sortSeasons = (seasons) => {
  return [...seasons].sort((a, b) => {
    const numA = a.match(/\d+/);
    const numB = b.match(/\d+/);
    if (numA && numB) return parseInt(numA[0], 10) - parseInt(numB[0], 10);
    if (numA && !numB) return -1;
    if (!numA && numB) return 1;
    return a.localeCompare(b);
  });
};

// --- IMAGE PIPELINE: convert uploads to WebP before they ever touch Supabase Storage ---
// Smaller files at rest = smaller files served later, which is the biggest lever we have
// on Supabase egress since every card image is re-downloaded on every page load.

// Cheap heuristic GIF-animation sniff: count Graphic Control Extension blocks (0x21 0xF9),
// which precede each animated frame. More than one strongly implies an animated GIF.
const isAnimatedGif = async (file) => {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let frameMarkers = 0;
    for (let i = 0; i < bytes.length - 1; i++) {
      if (bytes[i] === 0x21 && bytes[i + 1] === 0xf9) {
        frameMarkers++;
        if (frameMarkers > 1) return true;
      }
    }
    return false;
  } catch {
    return true; // fail safe: assume animated so we never silently strip an animation
  }
};

const resizeAndConvertToWebP = (file, maxDim = 1000, quality = 0.82) => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(objectUrl);
        if (blob) resolve(blob); else reject(new Error('Canvas could not produce a WebP blob'));
      }, 'image/webp', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not load image for conversion')); };
    img.src = objectUrl;
  });
};

// Note: a browser <canvas> can only ever grab a single still frame, so a truly *animated*
// GIF can't be losslessly re-encoded as an animated WebP client-side without a WASM
// encoder/decoder pair (out of scope here). To avoid silently flattening someone's
// animation, animated GIFs are left as GIF; everything else (static images, static GIFs,
// PNG/JPG/etc.) gets resized + converted to WebP.
const prepareImageForUpload = async (file) => {
  if (file.type === 'image/gif') {
    const animated = await isAnimatedGif(file);
    if (animated) return { blob: file, ext: 'gif', contentType: 'image/gif' };
  }
  try {
    const webpBlob = await resizeAndConvertToWebP(file);
    return { blob: webpBlob, ext: 'webp', contentType: 'image/webp' };
  } catch (err) {
    console.warn('WebP conversion failed, falling back to original file:', err.message);
    return { blob: file, ext: (file.name.split('.').pop() || 'bin').toLowerCase(), contentType: file.type || 'application/octet-stream' };
  }
};

// --- CLIENT-SIDE READ CACHE (egress optimization) ---
// Short-lived cache so flipping between tabs (or back to one you already visited) doesn't
// re-hit Supabase every single time. Cleared automatically after any write.
const CACHE_TTL = 45000;

export default function App() {
    // --- login ---
    const { instance, accounts } = useMsal();
    const isAuthenticated = useIsAuthenticated();

    const getAccessToken = async () => {
        try {
            const result = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
            return result.accessToken;
        } catch {
            const result = await instance.acquireTokenPopup(loginRequest);
            return result.accessToken;
        }
    };

    const handleLogin = () => instance.loginPopup(loginRequest);
    const handleLogout = () => instance.logoutPopup();

  // --- STATE MANAGEMENT ---
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Tabs & Views
  const [activeMainTab, setActiveMainTab] = useState('Umamusume');
  const [activeUmaTab, setActiveUmaTab] = useState('Canon');
  const [activeDormTab, setActiveDormTab] = useState('Ritto');
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  
  // Infinite Scroll Pagination
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 50;
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  
  // Relational Data
  const [availableTeams, setAvailableTeams] = useState([]);
  const [teamMembers, setTeamMembers] = useState({ head: [], assistant: [], trainees: [] });

  // Read caches (refs so they persist across renders without causing re-renders themselves)
  const dataCacheRef = useRef({});
  const teamMembersCacheRef = useRef({});
  const searchCacheRef = useRef({});

  // Form & Modals
  const [editingId, setEditingId] = useState(null); 
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, entryId: null, dbTable: null, ui_id: null, error: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
    const [formData, setFormData] = useState({
        category: 'Umamusume',
        name: '', link: '', submitter: '', imageBase64: '',
        type: 'Canon', dorm: 'Ritto', trainer: '', roommate: '', team: '',
        trainerRole: 'Head Trainer', season: ''
    });

  // --- 1. FETCH AVAILABLE TEAMS (For Dropdowns) ---
    const fetchTeamsList = async () => {
        try {
            const response = await fetch('/api/teams');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            setAvailableTeams(data.map(t => t.name));
        }
        catch (error) {
            console.error('fetchTeamsList error:', error);
        }
    };

  useEffect(() => {
    fetchTeamsList();
  }, []);

  const invalidateCaches = () => {
    dataCacheRef.current = {};
    teamMembersCacheRef.current = {};
    searchCacheRef.current = {};
  };

  const getCacheKey = () => {
    if (activeMainTab === 'Umamusume') return `Umamusume-${activeUmaTab}-${activeDormTab}`;
    return activeMainTab;
  };

  // --- 2. LAZY LOAD DATA (Tabs, Pagination, & Search) ---
  const loadData = async (isReset = false) => {
    const cacheKey = getCacheKey();

    if (isReset && activeMainTab !== 'Search') {
      const cached = dataCacheRef.current[cacheKey];
      if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        setEntries(cached.entries);
        setPage(cached.page);
        setHasMore(cached.hasMore);
        setLoading(false);
        return;
      }
      // Clear immediately so the previous tab's stale entries never flash inside the
      // newly-selected tab's layout while the fresh fetch is in flight.
      setEntries([]);
    }

    if (loading && !isReset) return;
    setLoading(true);
    
    const currentPage = isReset ? 0 : page;
    const from = currentPage * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      let newEntries = [];
      let fetchCount = 0;

      if (activeMainTab === 'Search') {
        const q = searchQuery.trim();
        if (!q) {
          setEntries([]);
          setHasMore(false);
          setLoading(false);
          return;
        }

        const cachedSearch = searchCacheRef.current[q];
        if (cachedSearch && (Date.now() - cachedSearch.timestamp) < CACHE_TTL) {
          setEntries(cachedSearch.entries);
          setHasMore(false);
          setLoading(false);
          return;
        }
        
          const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`);

          if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
          }

          const data = await response.json();

          const c = { data: data.characters };
          const t = { data: data.teams };
          const tr = { data: data.trainers };
          const n = { data: data.npcs };
          const r = { data: data.rivals };

        newEntries = [
          ...(c.data || []).map(e => ({ ...e, ui_id: `char-${e.id}`, _table: 'characters', category: 'Umamusume', trainer: e.trainer_name, team: e.team_name, type: e.type || 'Unassigned', dorm: e.dorm || 'Unassigned' })),
          ...(t.data || []).map(e => ({ ...e, ui_id: `team-${e.id}`, _table: 'teams', category: 'Team' })),
          ...(tr.data || []).map(e => ({ ...e, ui_id: `trn-${e.id}`, _table: 'trainers', category: 'Trainer', submitter: e.discord_submitter, team: e.team_name, trainerRole: e.position })),
          ...(n.data || []).map(e => ({ ...e, ui_id: `npc-${e.id}`, _table: 'npcs', category: 'NPC' })),
          ...(r.data || []).map(e => ({ ...e, ui_id: `riv-${e.id}`, _table: 'rivals', category: 'Rival' }))
        ].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

        searchCacheRef.current[q] = { entries: newEntries, timestamp: Date.now() };
        setEntries(newEntries);
        setHasMore(false);
        
      } else {
        if (activeMainTab === 'Umamusume') {
            const params = new URLSearchParams();

            params.set('type', activeUmaTab);
            params.set('dorm', activeDormTab);
            params.set('offset', from);
            params.set('limit', PAGE_SIZE);

            const response = await fetch(`/api/characters?${params.toString()}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
          newEntries = (data || []).map(e => ({ ...e, ui_id: `char-${e.id}`, _table: 'characters', category: 'Umamusume', trainer: e.trainer_name, team: e.team_name, type: e.type || 'Unassigned', dorm: e.dorm || 'Unassigned' }));
        
        } else if (activeMainTab === 'Teams') {
          // Pull all teams so the sidebar menu populates correctly
            const response = await fetch('/api/teams');

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
          newEntries = (data || []).map(e => ({ ...e, ui_id: `team-${e.id}`, _table: 'teams', category: 'Team' }));
          // Note: team member details only load once the user actually clicks a team
          // (see the "Teams member fetch" effect below) rather than being auto-selected.
        
        } else if (activeMainTab === 'Trainer') {
            const response = await fetch(
                `/api/trainers?offset=${from}&limit=${PAGE_SIZE}`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
          newEntries = (data || []).map(e => ({ ...e, ui_id: `trn-${e.id}`, _table: 'trainers', category: 'Trainer', submitter: e.discord_submitter, team: e.team_name, trainerRole: e.position }));
        
        } else if (activeMainTab === 'NPC') {
            const response = await fetch(
                `/api/npcs?offset=${from}&limit=${PAGE_SIZE}`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
          newEntries = (data || []).map(e => ({ ...e, ui_id: `npc-${e.id}`, _table: 'npcs', category: 'NPC' }));
        
        } else if (activeMainTab === 'Rival') {
            const response = await fetch(
                `/api/rivals?offset=${from}&limit=${PAGE_SIZE}`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
          newEntries = (data || []).map(e => ({ ...e, ui_id: `riv-${e.id}`, _table: 'rivals', category: 'Rival' }));
        }

        fetchCount = newEntries.length;
        const newHasMore = activeMainTab === 'Teams' ? false : fetchCount === PAGE_SIZE;
        const newPage = currentPage + 1;

        setEntries(prev => {
          const updated = isReset ? newEntries : [...prev, ...newEntries];
          dataCacheRef.current[cacheKey] = { entries: updated, page: newPage, hasMore: newHasMore, timestamp: Date.now() };
          return updated;
        });
        setHasMore(newHasMore);
        setPage(newPage);
      }
    } catch (err) {
      console.error('Fetch Error:', err.message);
    } finally {
      setLoading(false);
    }
  };
  // Trigger reset load when tabs change
  useEffect(() => {
    if (activeMainTab !== 'Search') {
      loadData(true);
    } else {
      setEntries([]); // Clear for fresh search
    }
  }, [activeMainTab, activeUmaTab, activeDormTab]);

  // --- 3. FETCH SPECIFIC TEAM MEMBERS (only once a team is actually clicked) ---
    useEffect(() => {
        const fetchTeamMembers = async () => {
            if (activeMainTab !== 'Teams' || !selectedTeamId) return;

            const teamEntries = entries.filter(e => e.category === 'Team');
            const selectedTeam = teamEntries.find(e => e.ui_id === selectedTeamId);

            if (!selectedTeam) return;

            const cached = teamMembersCacheRef.current[selectedTeam.name];

            if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
                setTeamMembers(cached.data);
                return;
            }

            try {
                const response = await fetch(
                    `/api/teams/${encodeURIComponent(selectedTeam.name)}/members`
                );

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const data = await response.json();

                const teamMembersData = {
                    head: (data.trainers || [])
                        .filter(t => t.position === 'Head Trainer')
                        .map(e => ({
                            ...e,
                            ui_id: `trn-${e.id}`,
                            _table: 'trainers',
                            category: 'Trainer',
                            submitter: e.discord_submitter,
                            team: e.team_name,
                            trainerRole: e.position
                        })),

                    assistant: (data.trainers || [])
                        .filter(t => t.position === 'Assistant Trainer')
                        .map(e => ({
                            ...e,
                            ui_id: `trn-${e.id}`,
                            _table: 'trainers',
                            category: 'Trainer',
                            submitter: e.discord_submitter,
                            team: e.team_name,
                            trainerRole: e.position
                        })),

                    trainees: (data.characters || [])
                        .map(e => ({
                            ...e,
                            ui_id: `char-${e.id}`,
                            _table: 'characters',
                            category: 'Umamusume',
                            trainer: e.trainer_name,
                            team: e.team_name,
                            type: e.type || 'Unassigned',
                            dorm: e.dorm || 'Unassigned'
                        }))
                };

                teamMembersCacheRef.current[selectedTeam.name] = {
                    data: teamMembersData,
                    timestamp: Date.now()
                };

                setTeamMembers(teamMembersData);
            }
            catch (error) {
                console.error('Team members fetch error:', error);
            }
        };

        fetchTeamMembers();
    }, [selectedTeamId, activeMainTab, entries]);

  // --- 4. INFINITE SCROLL LISTENER ---
  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    // Load more when user scrolls within 50px of the bottom
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (hasMore && !loading && activeMainTab !== 'Search') {
        loadData(false);
      }
    }
  };

  // --- 5. FORM & DATABASE OPERATIONS ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const token = await getAccessToken();

        try {
            // Run every upload through the WebP pipeline first.
            const { blob, ext, contentType } = await prepareImageForUpload(file);

            const formData = new FormData();

            formData.append(
                'image',
                blob,
                `upload.${ext}`
            );

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Upload failed');
            }

            setFormData(prev => ({
                ...prev,
                imageBase64: data.url
            }));
        }
        catch (err) {
            console.error('Error uploading image:', err.message);
            setErrorMsg(`Failed to upload image: ${err.message}`);
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
        setFormData(prev => ({ ...prev, name: '', link: '', submitter: '', imageBase64: '', trainer: '', roommate: '', team: '', season: '', trainerRole: 'Head Trainer' }));
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
        setErrorMsg('');
    };

    const confirmDelete = async () => {
        try {
            const token = await getAccessToken();
            const response = await fetch(
                `/api/${deleteModal.dbTable}/${deleteModal.entryId}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                }
            );

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Delete failed');

            setEntries(entries.filter(e => e.ui_id !== deleteModal.ui_id));
            if (selectedTeamId === deleteModal.ui_id) setSelectedTeamId(null);
            setDeleteModal({ isOpen: false, entryId: null, dbTable: null, ui_id: null, error: '' });
            setSuccessMsg('Entry deleted successfully.');
            setTimeout(() => setSuccessMsg(''), 3000);
            invalidateCaches();
            if (deleteModal.dbTable === 'teams') fetchTeamsList();
        } catch (err) {
            setDeleteModal(prev => ({ ...prev, error: 'Failed to delete row from database.' }));
        }
    };

  const handleSubmit = async (e) => {
    e.preventDefault();
      setErrorMsg(''); setSuccessMsg('');

      if (!isAuthenticated) {
          setErrorMsg('Please sign in first.');
          return;
      }
      const token = await getAccessToken();

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
      default: break;
    }

    try {
        if (editingId) {
            const existingEntry = entries.find(e => e.ui_id === editingId);

            if (!existingEntry) {
                throw new Error('Could not find entry being edited.');
            }

            const response = await fetch(
                `/api/${existingEntry._table}/${existingEntry.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(dbPayload)
                }
            );

              if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
              }

              const data = await response.json();

              if (!data.success) {
                  throw new Error(data.error || 'Update failed');
              }

              setSuccessMsg('Entry updated successfully!');
              setEditingId(null);
          }
          else{
              const response = await fetch(
                  `/api/${targetTable}`,
                  {
                      method: 'POST',
                      headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                      },
                      body: JSON.stringify(dbPayload)
                  }
              );

              if (!response.ok) {
                  throw new Error(`HTTP ${response.status}`);
              }

              const data = await response.json();

              if (!data.success) {
                  throw new Error(data.error || 'Insert failed');
              }

              setSuccessMsg(`${formData.name} added to database!`);
      }

      setFormData(prev => ({ ...prev, name: '', link: '', submitter: '', imageBase64: '', trainer: '', roommate: '', team: '', season: '' }));
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
      setTimeout(() => setSuccessMsg(''), 3000);
      
      invalidateCaches();
      if (formData.category === 'Team') fetchTeamsList();
      loadData(true); // Refresh active tab
    } catch (err) {
      setErrorMsg(`Failed to save entry: ${err.message}`);
    }
  };

  // --- 6. RENDER HELPERS ---
    const AdminControls = ({ entry }) => {
        if (!isAuthenticated) return null;
        return (
            <div className="absolute top-2 right-2 flex gap-1 bg-white/90 p-1 rounded-lg border border-slate-200 backdrop-blur shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button onClick={(e) => { e.stopPropagation(); handleEditClick(entry); }} className="p-1.5 text-blue-600 hover:text-blue-500 hover:bg-slate-100 rounded transition-colors" title="Edit">
                    <EditIcon />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, entryId: entry.id, dbTable: entry._table, ui_id: entry.ui_id, error: '' }); }} className="p-1.5 text-red-500 hover:text-red-400 hover:bg-slate-100 rounded transition-colors" title="Delete">
                    <TrashIcon />
                </button>
            </div>
        );
    };

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
        {entry.image ? <img src={entry.image} alt={entry.name} loading="lazy" decoding="async" className="w-full h-full object-cover object-top" /> : <span className="text-slate-400 text-xs font-bold text-center px-2">No Image</span>}
      </div>
      <div className="flex flex-col justify-between flex-grow p-3 text-sm pr-8">
        <div>
            <div className="text-lg font-black italic text-slate-800 leading-tight mb-1">{entry.name}</div>
            <div className="text-xs font-bold text-slate-400 mb-1 tracking-wide uppercase">{entry.category}</div>
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
            {member.image ? <img src={member.image} loading="lazy" decoding="async" className="w-full h-full object-cover object-top"/> : <span className="text-slate-400 text-xs font-bold text-center px-1">No Pic</span>}
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
    // SEARCH TAB
    if (activeMainTab === 'Search') {
      return (
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <input type="text" placeholder="Search characters, teams, trainers..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadData(true)} className="flex-grow bg-white border-2 border-slate-200 rounded-xl p-4 text-slate-800 font-bold outline-none focus:border-[#1942d8] shadow-sm"/>
            <button onClick={() => loadData(true)} className="px-8 py-4 bg-[#1942d8] hover:bg-[#3b72ff] text-white font-black italic rounded-xl shadow-md transition-colors text-lg">Search DB</button>
          </div>
          {entries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
              {entries.map(renderCard)}
            </div>
          ) : (
            !loading && searchQuery && <div className="text-center py-20 text-slate-400"><p className="text-xl font-black italic">No matches found for "{searchQuery}".</p></div>
          )}
        </div>
      );
    }

    // TEAMS TAB — concise, clickable list; member roster only appears once a team is selected
    if (activeMainTab === 'Teams') {
      const teamEntries = entries.filter(e => e.category === 'Team');
      const selectedTeam = teamEntries.find(e => e.ui_id === selectedTeamId);

      if (teamEntries.length === 0 && !loading) return <div className="text-center py-20 text-slate-500"><p className="text-xl font-black italic">No Teams created yet.</p></div>;

      return (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-1/3 flex flex-col gap-3">
            <h3 className="text-xl font-black italic text-slate-800 mb-1 px-2 border-l-4 border-[#1942d8]">Registered Teams</h3>
            <div className="flex flex-col gap-2">
              {teamEntries.map(team => {
                const isSelected = selectedTeamId === team.ui_id;
                return (
                  <div
                    key={team.ui_id}
                    onClick={() => setSelectedTeamId(isSelected ? null : team.ui_id)}
                    className={`relative group flex items-center gap-3 p-2 pr-10 border-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'border-[#1942d8] bg-blue-50/50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300'}`}
                  >
                    <AdminControls entry={team} />
                    <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-md overflow-hidden border border-slate-200 flex items-center justify-center">
                      {team.image ? <img src={team.image} alt={team.name} loading="lazy" decoding="async" className="w-full h-full object-cover"/> : <span className="text-slate-400 text-[9px] font-bold">N/A</span>}
                    </div>
                    <div className="font-black italic text-slate-800 text-sm truncate">{team.name}</div>
                  </div>
                );
              })}
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
                    {teamMembers.head.length > 0 ? teamMembers.head.map(m => renderTeamMemberCard(m, 'Head Trainer')) : <EmptyMemberPlaceholder roleLabel="Head Trainer" />}
                  </div>
                  <div className="space-y-3">
                    {teamMembers.assistant.length > 0 ? teamMembers.assistant.map(m => renderTeamMemberCard(m, 'Assistant Trainer')) : <EmptyMemberPlaceholder roleLabel="Assistant Trainer" />}
                  </div>
                  <div className="space-y-3">
                    {teamMembers.trainees.length > 0 ? teamMembers.trainees.map(m => renderTeamMemberCard(m, 'Umamusume Trainee')) : <EmptyMemberPlaceholder roleLabel="Umamusume Trainee" />}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[240px] flex items-center justify-center py-16 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                <p className="text-lg font-black italic">Select a team to view its roster.</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // UMAMUSUME TAB — Canon/OC/Unassigned tabs, then a second layer of Ritto/Miho/Independent tabs
    if (activeMainTab === 'Umamusume') {
      return (
        <div>
          <div className="flex mb-4 space-x-2 border-b-2 border-slate-200 pb-0 overflow-x-auto hide-scrollbar">
            <button onClick={() => setActiveUmaTab('Canon')} className={`px-6 py-3 rounded-t-lg font-black italic text-lg transition-colors -mb-0.5 ${activeUmaTab === 'Canon' ? 'bg-[#ff4da6] text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>Canon Roster</button>
            <button onClick={() => setActiveUmaTab('OC')} className={`px-6 py-3 rounded-t-lg font-black italic text-lg transition-colors -mb-0.5 ${activeUmaTab === 'OC' ? 'bg-[#00d182] text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>Original Characters</button>
            <button onClick={() => setActiveUmaTab('Unassigned')} className={`px-6 py-3 rounded-t-lg font-black italic text-lg transition-colors -mb-0.5 ${activeUmaTab === 'Unassigned' ? 'bg-[#8b5cf6] text-white' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>Unassigned / Needs Edit</button>
          </div>
          <div className="flex mb-6 space-x-2 overflow-x-auto hide-scrollbar">
            {['Ritto', 'Miho', 'Independent', 'Unassigned'].map(dorm => (
              <button
                key={dorm}
                onClick={() => setActiveDormTab(dorm)}
                className={`shrink-0 px-5 py-2 rounded-lg text-sm font-black italic transition-colors ${activeDormTab === dorm ? 'bg-[#1942d8] text-white shadow' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
              >
                {dorm}{dorm !== 'Independent' && dorm !== 'Unassigned' ? ' Dorm' : ''}
              </button>
            ))}
          </div>
          {entries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{entries.map(renderCard)}</div>
          )}
        </div>
      );
    }

    // TRAINER TAB
    if (activeMainTab === 'Trainer') {
      const teamsList = [...new Set(entries.map(e => e.team || 'Independent'))].sort();
      return teamsList.map(team => {
        const group = entries.filter(e => (e.team || 'Independent') === team);
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

    // NPC TAB
    if (activeMainTab === 'NPC') {
      return (
        <div className="mb-10">
          <h3 className="text-2xl font-black italic text-slate-800 pb-2 mb-4 flex items-center gap-2">
             <span className="w-4 h-8 inline-block -skew-x-12 bg-[#1942d8]"></span>
             Registered NPCs
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">{entries.map(renderCard)}</div>
        </div>
      );
    }

    // RIVAL TAB — grouped and auto-sorted by season, starting at Season 0
    if (activeMainTab === 'Rival') {
      const seasons = sortSeasons([...new Set(entries.map(e => e.season || 'General'))]);
      return seasons.map(season => {
        const group = entries.filter(e => (e.season || 'General') === season);
        return (
          <div key={season} className="mb-10">
            <h3 className="text-2xl font-black italic text-slate-800 pb-2 mb-4 flex items-center gap-2">
               <span className="w-4 h-8 inline-block -skew-x-12 bg-[#ff3b3b]"></span>
               {season}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">{group.map(renderCard)}</div>
          </div>
        );
      });
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
                  {isAuthenticated ? (
                      <button onClick={handleLogout} className="px-3 sm:px-6 py-1.5 bg-white/10 text-white font-bold italic rounded border border-white/40 hover:bg-white/20 transition-colors text-xs sm:text-base">
                          Sign out{accounts[0]?.name ? ` (${accounts[0].name})` : ''}
                      </button>
                  ) : (
                      <button onClick={handleLogin} className="px-3 sm:px-6 py-1.5 bg-white/10 text-white font-bold italic rounded border border-white/40 hover:bg-white/20 transition-colors text-xs sm:text-base">
                          Sign in
                      </button>
                  )}
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
                      {!isAuthenticated ? (
                          <div className="text-center py-10">
                              <p className="text-slate-500 font-bold mb-4">Sign in to add or edit entries.</p>
                              <button onClick={handleLogin} className="bg-[#1942d8] hover:bg-[#3b72ff] text-white font-black italic py-3 px-6 rounded shadow-md">
                                  Sign in with Microsoft
                              </button>
                          </div>
                      ) : (
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
                    <input type="text" name="season" placeholder="e.g. Season 0, Season 1, URA Finals" value={formData.season} onChange={handleInputChange} className="w-full bg-white border border-slate-200 rounded p-2 text-sm text-slate-700 font-medium" />
                  </div>
                )}
              </div>

              <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{formData.category === 'Team' ? 'Team Name' : 'Character Name'}</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full bg-white border-2 border-slate-200 rounded p-2 text-slate-800 font-medium focus:border-[#1942d8] outline-none" /></div>
              
              {['Umamusume', 'Trainer', 'NPC'].includes(formData.category) && (
                  <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Discord Owner / Submitter</label><input type="text" name="submitter" value={formData.submitter} onChange={handleInputChange} className="w-full bg-white border-2 border-slate-200 rounded p-2 text-slate-800 font-medium focus:border-[#1942d8] outline-none" /></div>
              )}
              {['Umamusume', 'Team', 'Trainer', 'NPC', 'Rival'].includes(formData.category) && (
                  <div><label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Google Doc / Source Link</label><input type="url" name="link" value={formData.link} onChange={handleInputChange} className="w-full bg-white border-2 border-slate-200 rounded p-2 text-slate-800 font-medium focus:border-[#1942d8] outline-none" /></div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Image / Logo Upload</label>
                <div className="flex items-center gap-3">
                  {formData.imageBase64 && (
                    <div className="w-10 h-10 shrink-0 bg-slate-100 rounded border border-slate-200 overflow-hidden shadow-sm flex items-center justify-center">
                      <img src={formData.imageBase64} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} className="w-full bg-white border-2 border-slate-200 rounded p-1 text-slate-600 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer" />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Images are automatically converted to WebP (and resized) before upload to keep storage/egress low. Animated GIFs are kept as GIF so the animation isn't lost.</p>
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
                      )}
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-lg border-2 border-slate-100 h-[calc(100vh-100px)] overflow-hidden flex flex-col">
            
            <div className="shrink-0 flex bg-[#f8f9fc] border-b-4 border-slate-200 overflow-x-auto hide-scrollbar w-full sticky top-0 z-20">
              {['Search', 'Umamusume', 'Teams', 'Trainer', 'NPC', 'Rival'].map(tab => {
                const colorMap = { 'Search': '#00d182', 'Umamusume': '#ff4da6', 'Teams': '#8b5cf6', 'Trainer': '#ffb800', 'NPC': '#1942d8', 'Rival': '#ff3b3b' };
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

            {/* Note the onScroll listener added to this div below */}
            <div className="p-6 sm:p-8 bg-slate-50/50 flex-grow overflow-y-auto" onScroll={handleScroll}>
              {renderGallery()}
              
              {entries.length === 0 && !loading && activeMainTab !== 'Teams' && activeMainTab !== 'Search' && (
                <div className="text-center py-20 text-slate-400"><p className="text-2xl font-black italic">No entries yet for this category.</p></div>
              )}
              
              {loading && (
                <div className="flex justify-center items-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-b-4 border-[#1942d8]"></div>
                </div>
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
                      {deleteModal.error && <p className="text-[#ff3b3b] text-sm mb-4 font-bold">{deleteModal.error}</p>}
                      <div className="flex justify-end gap-3 mt-6">
                          <button onClick={() => setDeleteModal({ isOpen: false, entryId: null, dbTable: null, ui_id: null, error: '' })} className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded font-black italic transition-colors">Cancel</button>
                          <button onClick={confirmDelete} className="px-5 py-2 bg-[#ff3b3b] hover:bg-red-600 text-white rounded font-black italic transition-colors shadow-md">Permanently Delete</button>
                      </div>
                  </div>
              </div>
          )}
    </div>
  );
}