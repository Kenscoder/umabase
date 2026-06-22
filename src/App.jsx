import React, { useState } from 'react';

// Unified Initial Data Structure
const INITIAL_DATA = [
  { id: 1, category: 'Umamusume', type: 'Canon', dorm: 'Ritto', name: 'Special Week', submitter: 'System', link: '#', image: 'https://placehold.co/400x400/4f46e5/ffffff?text=Spe' },
  { id: 2, category: 'Umamusume', type: 'OC', dorm: 'Miho', name: 'Shadow Racer', submitter: 'Mod01', link: '#', image: 'https://placehold.co/400x400/10b981/ffffff?text=SR' },
  { id: 3, category: 'Trainer', team: 'Team Sirius', name: 'Trainer Aki', submitter: 'System', link: '#', image: 'https://placehold.co/400x400/f59e0b/ffffff?text=Aki' },
  { id: 4, category: 'NPC', alignment: 'Enemy', name: 'Rival Syndicate', submitter: 'Mod02', link: '#', image: 'https://placehold.co/400x400/ef4444/ffffff?text=Rival' }
];

export default function App() {
  const [entries, setEntries] = useState(INITIAL_DATA);
  const [activeMainTab, setActiveMainTab] = useState('Umamusume');
  const [activeUmaTab, setActiveUmaTab] = useState('Canon'); // Sub-tab for Umamusume
  
  // Dynamic Form State
  const [formData, setFormData] = useState({
    category: 'Umamusume',
    name: '', link: '', submitter: '', image: '',
    type: 'Canon', dorm: 'Ritto', // Uma specific
    team: '',                     // Trainer specific
    alignment: 'Friendly',        // NPC specific
    password: ''
  });
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg(''); setSuccessMsg('');

    if (formData.password !== 'carrot') {
      setErrorMsg('Invalid Password of the Day.');
      return;
    }

    const newEntry = {
      id: Date.now(),
      category: formData.category,
      name: formData.name, link: formData.link, submitter: formData.submitter, image: formData.image,
      ...(formData.category === 'Umamusume' && { type: formData.type, dorm: formData.dorm }),
      ...(formData.category === 'Trainer' && { team: formData.team || 'Unaffiliated' }),
      ...(formData.category === 'NPC' && { alignment: formData.alignment })
    };

    setEntries([...entries, newEntry]);
    setSuccessMsg(`${formData.name} added to the database!`);
    
    // Reset core fields, keep category sticky for ease of use
    setFormData(prev => ({ ...prev, name: '', link: '', submitter: '', image: '', team: '', password: '' }));
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // --- RENDER HELPERS ---

  const renderCard = (entry) => (
    <div key={entry.id} className="bg-slate-800 border border-slate-700 rounded-lg shadow-lg overflow-hidden hover:border-emerald-500 transition-colors flex flex-col">
      <div className="h-48 w-full bg-slate-900 flex items-center justify-center overflow-hidden">
        {entry.image ? (
          <img src={entry.image} alt={entry.name} className="w-full h-full object-cover object-top" onError={(e) => e.target.src = 'https://placehold.co/400x400/1e293b/ffffff?text=No+Image'} />
        ) : (
          <span className="text-slate-600 font-bold">No Image</span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-grow">
        <h4 className="text-xl font-bold text-white mb-1">{entry.name}</h4>
        {entry.category === 'Trainer' && <p className="text-sm font-semibold text-amber-400 mb-1">{entry.team}</p>}
        {entry.category === 'NPC' && <p className={`text-sm font-semibold mb-1 ${entry.alignment === 'Enemy' ? 'text-red-400' : 'text-blue-400'}`}>{entry.alignment} NPC</p>}
        <p className="text-xs text-slate-400 mb-4 flex-grow">Submitted by: <span className="text-slate-300">{entry.submitter}</span></p>
        <a href={entry.link} target="_blank" rel="noopener noreferrer" className="block w-full text-center bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded transition-colors mt-auto">
          View Sheet
        </a>
      </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{group.map(renderCard)}</div>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeMainTab === 'Trainers') {
      // Extract unique teams and group
      const teams = [...new Set(categoryEntries.map(e => e.team))].sort();
      return teams.map(team => {
        const group = categoryEntries.filter(e => e.team === team);
        return (
          <div key={team} className="mb-8">
            <h3 className="text-xl font-bold border-b border-slate-700 pb-2 mb-4 text-amber-400">{team}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{group.map(renderCard)}</div>
          </div>
        );
      });
    }

    if (activeMainTab === 'NPCs') {
      return ['Friendly', 'Enemy'].map(align => {
        const group = categoryEntries.filter(e => e.alignment === align);
        if (group.length === 0) return null;
        return (
          <div key={align} className="mb-8">
            <h3 className={`text-xl font-bold border-b border-slate-700 pb-2 mb-4 ${align === 'Enemy' ? 'text-red-400' : 'text-blue-400'}`}>{align} Elements</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{group.map(renderCard)}</div>
          </div>
        );
      });
    }
  };

  return (
    <div className="min-h-screen p-6 font-sans">
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
                  <option value="NPC">NPC / Organization</option>
                </select>
              </div>

              {/* DYNAMIC FIELDS */}
              <div className="p-4 bg-slate-900/50 rounded border border-slate-700/50">
                {formData.category === 'Umamusume' && (
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
                )}
                {formData.category === 'Trainer' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Team Name</label>
                    <input type="text" name="team" placeholder="e.g. Team Sirius" value={formData.team} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white" />
                  </div>
                )}
                {formData.category === 'NPC' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Alignment</label>
                    <select name="alignment" value={formData.alignment} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-sm text-white">
                      <option value="Friendly">Friendly / Ally</option>
                      <option value="Enemy">Enemy / Rival</option>
                    </select>
                  </div>
                )}
              </div>

              {/* UNIVERSAL FIELDS */}
              <div><label className="block text-sm text-slate-400 mb-1">Name</label><input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Image URL <span className="text-xs">(Discord/Imgur link)</span></label><input type="url" name="image" placeholder="https://..." value={formData.image} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Google Doc Link</label><input type="url" name="link" value={formData.link} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">Discord Submitter</label><input type="text" name="submitter" value={formData.submitter} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" /></div>
              <div className="pt-4 border-t border-slate-700"><label className="block text-sm text-slate-400 mb-1">Password of the Day</label><input type="password" name="password" value={formData.password} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-red-500 outline-none" /></div>

              {errorMsg && <p className="text-red-400 text-sm mt-2">{errorMsg}</p>}
              {successMsg && <p className="text-emerald-400 text-sm mt-2">{successMsg}</p>}

              <button type="submit" className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded transition-colors shadow-lg">Submit to Database</button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN GALLERY */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 min-h-[800px]">
            
            {/* Main Category Tabs */}
            <div className="flex bg-slate-900 border-b-2 border-slate-700 rounded-t-xl overflow-hidden">
              <button onClick={() => setActiveMainTab('Umamusume')} className={`flex-1 py-4 text-lg font-bold transition-colors ${activeMainTab === 'Umamusume' ? 'text-emerald-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>🐴 Umamusume Roster</button>
              <button onClick={() => setActiveMainTab('Trainers')} className={`flex-1 py-4 text-lg font-bold transition-colors border-l border-slate-700 ${activeMainTab === 'Trainers' ? 'text-amber-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>📋 Trainers & Teams</button>
              <button onClick={() => setActiveMainTab('NPCs')} className={`flex-1 py-4 text-lg font-bold transition-colors border-l border-slate-700 ${activeMainTab === 'NPCs' ? 'text-blue-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}>🌍 NPCs & Rivals</button>
            </div>

            {/* Gallery Area */}
            <div className="p-6">
              {renderGallery()}
              {entries.filter(e => e.category === activeMainTab).length === 0 && (
                <div className="text-center py-20 text-slate-500"><p className="text-xl font-semibold">No data found for this category.</p></div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}