import React, { useState } from 'react';

// Unified Initial Data Structure (using placeholder URLs for the dummies)
const INITIAL_DATA = [
  { id: 1, category: 'Umamusume', type: 'Canon', dorm: 'Ritto', name: 'Special Week', submitter: 'System', link: '#', image: 'https://placehold.co/150x150/4f46e5/ffffff?text=Spe', trainer: 'Trainer T', roommate: 'Silence Suzuka', date: '6/24/2026' },
  { id: 2, category: 'Umamusume', type: 'OC', dorm: 'Miho', name: 'Shadow Racer', submitter: 'Mod01', link: '#', image: 'https://placehold.co/150x150/10b981/ffffff?text=SR', trainer: 'None', roommate: 'None', date: '6/24/2026' },
  { id: 3, category: 'Trainer', team: 'Team Sirius', name: 'Trainer Aki', submitter: 'System', link: '#', image: 'https://placehold.co/150x150/f59e0b/ffffff?text=Aki', date: '6/24/2026' },
  { id: 4, category: 'NPC', name: 'Student Council President', submitter: 'System', link: '#', image: 'https://placehold.co/150x150/3b82f6/ffffff?text=NPC', date: '6/24/2026' },
  { id: 5, category: 'Rival', season: 'URA Finals', name: 'Happy Mikul', submitter: 'Mod02', link: '#', image: 'https://placehold.co/150x150/ef4444/ffffff?text=Rival', date: '6/24/2026' }
];

export default function App() {
  const [entries, setEntries] = useState(INITIAL_DATA);
  const [activeMainTab, setActiveMainTab] = useState('Umamusume');
  const [activeUmaTab, setActiveUmaTab] = useState('Canon'); 
  
  // Dynamic Form State
  const [formData, setFormData] = useState({
    category: 'Umamusume',
    name: '', link: '', submitter: '', imageBase64: '',
    type: 'Canon', dorm: 'Ritto', trainer: '', roommate: '', // Uma specific
    team: '',      // Trainer specific
    season: '',    // Rival specific
    password: ''
  });
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle local file uploads by converting them to a Base64 string
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageBase64: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');

    if (formData.password !== 'carrot') {
      setErrorMsg('Invalid Password of the Day.');
      return;
    }

    // Grab today's date
    const today = new Date().toLocaleDateString();

    const newEntry = {
      id: Date.now(),
      category: formData.category,
      name: formData.name, 
      link: formData.link, 
      submitter: formData.submitter, 
      image: formData.imageBase64, 
      date: today,
      ...(formData.category === 'Umamusume' && { type: formData.type, dorm: formData.dorm, trainer: formData.trainer || 'None', roommate: formData.roommate || 'None' }),
      ...(formData.category === 'Trainer' && { team: formData.team || 'Unaffiliated' }),
      ...(formData.category === 'Rival' && { season: formData.season || 'General' })
    };

    setEntries([...entries, newEntry]);
    setSuccessMsg(`${formData.name} added to the database!`);
    
    // Reset core fields, keep category sticky for ease of use
    setFormData(prev => ({ ...prev, name: '', link: '', submitter: '', imageBase64: '', trainer: '', roommate: '', team: '', season: '', password: '' }));
    
    // Clear the file input visually
    document.getElementById('file-upload').value = '';
    
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // --- RENDER HELPERS ---

  // Refactored Card matching the wireframe
  const renderCard = (entry) => (
    <div key={entry.id} className="bg-slate-800 border-2 border-slate-700 p-4 rounded-xl shadow-lg hover:border-emerald-500 transition-colors flex flex-col gap-4">
      
      {/* Top half: Image Left, Info Right */}
      <div className="flex flex-row gap-4">
        {/* Profile Picture Box */}
        <div className="w-32 h-32 shrink-0 bg-slate-900 border-2 border-slate-600 flex items-center justify-center overflow-hidden rounded">
          {entry.image ? (
            <img src={entry.image} alt={entry.name} className="w-full h-full object-cover object-top" />
          ) : (
            <span className="text-slate-500 text-xs font-bold text-center px-2">No Profile Picture</span>
          )}
        </div>
        
        {/* Character Info Box */}
        <div className="flex flex-col justify-center flex-grow text-sm space-y-1">
          <div className="text-lg font-bold text-white leading-tight">{entry.name}</div>
          <div className="text-slate-300"><span className="text-slate-500">Owner:</span> {entry.submitter}</div>
          <div className="text-slate-300"><span className="text-slate-500">Approved:</span> {entry.date}</div>
          
          {/* Category Specific Info */}
          {entry.category === 'Umamusume' && (
            <>
              <div className="text-slate-300"><span className="text-slate-500">Trainer:</span> {entry.trainer}</div>
              <div className="text-slate-300"><span className="text-slate-500">Roommate:</span> {entry.roommate}</div>
            </>
          )}
          {entry.category === 'Trainer' && (
            <div className="text-amber-400 font-semibold"><span className="text-slate-500">Team:</span> {entry.team}</div>
          )}
          {entry.category === 'Rival' && (
            <div className="text-red-400 font-semibold"><span className="text-slate-500">Season/Arc:</span> {entry.season}</div>
          )}
          {entry.category === 'NPC' && (
            <div className="text-blue-400 font-semibold">General NPC</div>
          )}
        </div>
      </div>

      {/* Bottom half: Button */}
      <a href={entry.link} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded-full border-2 border-slate-900 transition-colors shadow">
        Sheet link button
      </a>
    </div>
  );

  const renderGallery = () => {
    const categoryEntries = entries.filter(e => e.category === activeMainTab);

    if (activeMainTab === 'Umamusume') {
      const typeFiltered = categoryEntries.filter(e => e.type === activeUmaTab);
      return (
        <div>
          <div className="flex mb-6 space-x-2 border-b border-slate-700 pb-2">
            <button onClick={() => setActiveUmaTab('Canon')} className={`px-4 py-2 rounded-t font-bold transition-colors ${activeUmaTab === 'Canon' ? 'bg-slate-800 text-emerald-400 border-t border-x border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>Canon Roster</button>
            <button onClick={() => setActiveUmaTab('OC')} className={`px-4 py-2 rounded-t font-bold transition-colors ${activeUmaTab === 'OC' ? 'bg-slate-800 text-emerald-400 border-t border-x border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}>Original Characters</button>
          </div>
          {['Ritto', 'Miho', 'Independent'].map(dorm => {
            const group = typeFiltered.filter(e => e.dorm === dorm);
            if (group.length === 0) return null;
            return (
              <div key={dorm} className="mb-8">
                <h3 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4 text-emerald-400">{dorm} {dorm !== 'Independent' && 'Dorm'}</h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">{group.map(renderCard)}</div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeMainTab === 'Trainers') {
      const teams = [...new Set(categoryEntries.map(e => e.team))].sort();
      return teams.map(team => {
        const group = categoryEntries.filter(e => e.team === team);
        return (
          <div key={team} className="mb-8">
            <h3 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4 text-amber-400">{team}</h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">{group.map(renderCard)}</div>
          </div>
        );
      });
    }

    if (activeMainTab === 'Rivals') {
      const seasons = [...new Set(categoryEntries.map(e => e.season))].sort();
      return seasons.map(season => {
        const group = categoryEntries.filter(e => e.season === season);
        return (
          <div key={season} className="mb-8">
            <h3 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4 text-red-400">{season}</h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">{group.map(renderCard)}</div>
          </div>
        );
      });
    }

    if (activeMainTab === 'NPCs') {
      return (
        <div className="mb-8">
          <h3 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4 text-blue-400">Registered NPCs</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">{categoryEntries.map(renderCard)}</div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6 font-sans">
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT COLUMN: MOD CONSOLE */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700 sticky top-6">
            <h2 className="text-2xl font-bold mb-6 text-white border-b border-slate-600 pb-2">Database Input</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Entry Category</label>
                <select name="category" value={formData.category} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-emerald-500 outline-none font-bold text-emerald-400">
                  <option value="Umamusume">Umamusume</option>
                  <option value="Trainer">Trainer</option>
                  <option value="NPC">General NPC</option>
                  <option value="Rival">Rival / Enemy</option>
                </select>
              </div>

              {/* DYNAMIC FIELDS */}
              <div className="p-4 bg-slate-900/50 rounded border border-slate-700/50 space-y-3">
                {formData.category === 'Umamusume' && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Type</label>
                        <select name="type" value={formData.type} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white">
                          <option value="Canon">Canon</option>
                          <option value="OC">OC</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Dormitory</label>
                        <select name="dorm" value={formData.dorm} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white">
                          <option value="Ritto">Ritto</option>
                          <option value="Miho">Miho</option>
                          <option value="Independent">Independent</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Current Trainer (Optional)</label>
                      <input type="text" name="trainer" placeholder="e.g. Trainer Aki" value={formData.trainer} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Roommate (Optional)</label>
                      <input type="text" name="roommate" placeholder="e.g. Special Week" value={formData.roommate} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white" />
                    </div>
                  </>
                )}
                {formData.category === 'Trainer' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Team Name</label>
                    <input type="text" name="team" placeholder="e.g. Team Sirius" value={formData.team} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white" />
                  </div>
                )}
                {formData.category === 'Rival' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Season / Arc</label>
                    <input type="text" name="season" placeholder="e.g. URA Finals" value={formData.season} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white" />
                  </div>
                )}
                {formData.category === 'NPC' && (
                  <div className="text-xs text-slate-500 italic">General NPCs require no extra categorization.</div>
                )}
              </div>

              {/* UNIVERSAL FIELDS */}
              <div><label className="block text-sm text-slate-400 mb-1">Character Name</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Discord Owner / Submitter</label><input type="text" name="submitter" value={formData.submitter} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Google Doc Link</label><input type="url" name="link" value={formData.link} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>
              
              {/* FILE UPLOAD */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">Profile Picture Upload</label>
                <input id="file-upload" type="file" accept="image/*" onChange={handleImageUpload} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-slate-400 text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-slate-700 file:text-white hover:file:bg-slate-600 cursor-pointer" />
              </div>

              <div className="pt-4 border-t border-slate-700"><label className="block text-sm text-slate-400 mb-1">Password of the Day</label><input type="password" name="password" value={formData.password} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-red-500 outline-none" /></div>

              {errorMsg && <p className="text-red-400 text-sm mt-2">{errorMsg}</p>}
              {successMsg && <p className="text-emerald-400 text-sm mt-2">{successMsg}</p>}

              <button type="submit" className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded transition-colors shadow-lg">Upload to Database</button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN GALLERY */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 min-h-[800px]">
            
            {/* Main Category Tabs */}
            <div className="flex bg-slate-900 border-b-2 border-slate-700 rounded-t-xl overflow-x-auto overflow-y-hidden hide-scrollbar">
              <button onClick={() => setActiveMainTab('Umamusume')} className={`whitespace-nowrap px-6 py-4 text-lg font-bold transition-colors ${activeMainTab === 'Umamusume' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>🐴 Umamusume</button>
              <button onClick={() => setActiveMainTab('Trainers')} className={`whitespace-nowrap px-6 py-4 text-lg font-bold transition-colors border-l border-slate-700 ${activeMainTab === 'Trainers' ? 'text-amber-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>📋 Trainers</button>
              <button onClick={() => setActiveMainTab('NPCs')} className={`whitespace-nowrap px-6 py-4 text-lg font-bold transition-colors border-l border-slate-700 ${activeMainTab === 'NPCs' ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>🌍 NPCs</button>
              <button onClick={() => setActiveMainTab('Rivals')} className={`whitespace-nowrap px-6 py-4 text-lg font-bold transition-colors border-l border-slate-700 ${activeMainTab === 'Rivals' ? 'text-red-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>⚔️ Rivals</button>
            </div>

            {/* Gallery Area */}
            <div className="p-6">
              {renderGallery()}
              {entries.filter(e => e.category === activeMainTab).length === 0 && (
                <div className="text-center py-20 text-slate-500"><p className="text-xl font-semibold">No entries yet for this category.</p></div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}