import React, { useState } from 'react';

const INITIAL_DATA = [
  { id: 1, name: 'Special Week', link: '#', submitter: 'System', type: 'Canon', dorm: 'Ritto' },
  { id: 2, name: 'Silence Suzuka', link: '#', submitter: 'System', type: 'Canon', dorm: 'Ritto' },
  { id: 3, name: 'El Condor Pasa', link: '#', submitter: 'System', type: 'Canon', dorm: 'Miho' },
  { id: 4, name: 'Shadow Racer', link: '#', submitter: 'Mod01', type: 'OC', dorm: 'Miho' },
  { id: 5, name: 'Crimson Hoof', link: '#', submitter: 'Mod02', type: 'OC', dorm: 'Independent' }
];

export default function App() {
  const [characters, setCharacters] = useState(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState('Canon');
  
  // Mod Form State
  const [formData, setFormData] = useState({
    name: '',
    link: '',
    submitter: '',
    type: 'Canon',
    dorm: 'Ritto',
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
    setErrorMsg('');
    setSuccessMsg('');

    // Security Check
    if (formData.password !== 'carrot') {
      setErrorMsg('Invalid Password of the Day.');
      return;
    }

    // Create new entry
    const newCharacter = {
      id: Date.now(),
      name: formData.name,
      link: formData.link,
      submitter: formData.submitter,
      type: formData.type,
      dorm: formData.dorm
    };

    setCharacters([...characters, newCharacter]);
    setSuccessMsg(`${formData.name} added to the database!`);
    
    // Clear form fields
    setFormData({
      name: '', link: '', submitter: '', type: 'Canon', dorm: 'Ritto', password: ''
    });
    
    // Clear success message after 3 seconds
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Helper function to render character cards grouped by dorm
  const renderDormGroup = (dormName, currentType) => {
    const filteredChars = characters.filter(c => c.type === currentType && c.dorm === dormName);
    
    if (filteredChars.length === 0) return null;

    return (
      <div key={dormName} className="mb-8">
        <h3 className="text-xl font-bold border-b-2 border-slate-700 pb-2 mb-4 text-emerald-400">
          {dormName} {dormName === 'Independent' ? '' : 'Dorm'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChars.map(char => (
            <div key={char.id} className="bg-slate-800 border border-slate-700 p-4 rounded-lg shadow-lg hover:border-emerald-500 transition-colors">
              <h4 className="text-lg font-bold text-white mb-1">{char.name}</h4>
              <p className="text-sm text-slate-400 mb-4">Submitted by: <span className="text-slate-300">{char.submitter}</span></p>
              <a 
                href={char.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block w-full text-center bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                View Sheet
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6 font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT COLUMN: MOD SUBMISSION PANEL */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 p-6 rounded-xl shadow-xl border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 text-white border-b border-slate-600 pb-2">Mod Console</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Character Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-emerald-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Google Doc Link</label>
                <input type="url" name="link" value={formData.link} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-emerald-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Discord Submitter</label>
                <input type="text" name="submitter" value={formData.submitter} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-emerald-500 outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Type</label>
                  <select name="type" value={formData.type} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-emerald-500 outline-none">
                    <option value="Canon">Canon</option>
                    <option value="OC">OC</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Dormitory</label>
                  <select name="dorm" value={formData.dorm} onChange={handleInputChange} className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-emerald-500 outline-none">
                    <option value="Ritto">Ritto</option>
                    <option value="Miho">Miho</option>
                    <option value="Independent">Independent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1 mt-4">Password of the Day</label>
                <input type="password" name="password" value={formData.password} onChange={handleInputChange} required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white focus:border-emerald-500 outline-none" />
              </div>

              {errorMsg && <p className="text-red-400 text-sm mt-2">{errorMsg}</p>}
              {successMsg && <p className="text-emerald-400 text-sm mt-2">{successMsg}</p>}

              <button type="submit" className="w-full mt-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded transition-colors shadow-lg">
                Submit to Database
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: DATABASE VIEWER */}
        <div className="lg:col-span-3">
          <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
            
            {/* Header / Tabs */}
            <div className="flex bg-slate-900 border-b border-slate-700">
              <button 
                onClick={() => setActiveTab('Canon')}
                className={`flex-1 py-4 text-lg font-bold transition-colors ${activeTab === 'Canon' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
              >
                Canon Roster
              </button>
              <button 
                onClick={() => setActiveTab('OC')}
                className={`flex-1 py-4 text-lg font-bold transition-colors ${activeTab === 'OC' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
              >
                Original Characters
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6">
              {['Ritto', 'Miho', 'Independent'].map(dorm => renderDormGroup(dorm, activeTab))}
              
              {characters.filter(c => c.type === activeTab).length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-xl">No characters found in this category.</p>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}