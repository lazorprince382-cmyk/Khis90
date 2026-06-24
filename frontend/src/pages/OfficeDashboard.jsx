import { useState, useEffect } from 'react';

import { useSearchParams, Link } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

import { api } from '../services/api';

import './OfficeDashboard.css';



const LOC_LABELS = {

  in_school: 'In School', in_library: 'Library', at_lunch: 'Lunch', out_of_school: 'Out',

};



export default function OfficeDashboard() {

  const { user, loading: authLoading } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState(null);

  const [offices, setOffices] = useState([]);

  const [selectedOffice, setSelectedOffice] = useState('');

  const [initDone, setInitDone] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState('');



  useEffect(() => {

    if (authLoading || !user) return;



    let cancelled = false;



    async function init() {

      setInitDone(false);

      setError('');

      try {

        const urlId = searchParams.get('id');



        if (user.role === 'admin') {

          const list = await api.listOffices();

          if (cancelled) return;

          setOffices(list);



          if (list.length === 0) {

            setSelectedOffice('');

            setError('No offices found. Create one under Manage Offices.');

            setLoading(false);

            setInitDone(true);

            return;

          }



          const valid = urlId && list.some((o) => o.id === urlId);

          const pick = valid ? urlId : list[0].id;

          setSelectedOffice(pick);

          if (!valid && urlId) {

            setSearchParams({ id: pick }, { replace: true });

          }

        } else if (user.office_id) {

          setSelectedOffice(user.office_id);

        } else {

          setError('No office assigned to your account.');

          setLoading(false);

        }

      } catch (err) {

        if (!cancelled) {

          setError(err.error || 'Failed to load offices.');

          setLoading(false);

        }

      } finally {

        if (!cancelled) setInitDone(true);

      }

    }



    init();

    return () => { cancelled = true; };

  }, [user, authLoading, searchParams, setSearchParams]);



  useEffect(() => {

    if (!initDone || !selectedOffice) return;



    let cancelled = false;



    async function load() {

      setLoading(true);

      setError('');

      try {

        const dash = await api.getOfficeDashboard(selectedOffice);

        if (!cancelled) setData(dash);

      } catch (err) {

        if (!cancelled) {

          setData(null);

          setError(err.error || err.message || 'Failed to load office dashboard.');

        }

      } finally {

        if (!cancelled) setLoading(false);

      }

    }



    load();

    const interval = setInterval(load, 30000);

    return () => { cancelled = true; clearInterval(interval); };

  }, [selectedOffice, initDone]);



  function handleOfficeChange(id) {

    setSelectedOffice(id);

    setSearchParams(id ? { id } : {});

  }



  if (authLoading || (loading && !data && !error)) {

    return <div className="office-dash-loading">Loading office dashboard...</div>;

  }



  if (error && !data) {

    return (

      <div className="office-dash-error">

        <h2>Could not load dashboard</h2>

        <p>{error}</p>

        {user?.role === 'admin' && (

          <Link to="/offices" className="btn btn-primary">Go to Manage Offices</Link>

        )}

      </div>

    );

  }



  if (!data) return null;



  const { office, total_learners, location_counts, learners_in_school, recent_scans_today, on_exeat, absent_day_scholars } = data;



  return (

    <div className="office-dashboard">

      <div className="office-dash-header" style={{ borderLeftColor: office.dashboard_color || '#7B1E3A' }}>

        <div>

          <h1>{office.name}</h1>

          <p>{office.description || office.department}</p>

          <div className="office-scope">

            {office.monitor_learner_types?.map((t) => (

              <span key={t} className={`badge ${t === 'boarding' ? 'badge-in-library' : 'badge-at-lunch'}`}>{t} scholars</span>

            ))}

            {office.monitor_sections?.map((s) => <span key={s} className="badge badge-out">{s}</span>)}

          </div>

        </div>

        {user?.role === 'admin' && offices.length > 0 && (

          <select value={selectedOffice} onChange={(e) => handleOfficeChange(e.target.value)} className="office-select">

            {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}

          </select>

        )}

      </div>



      <div className="office-stats">

        <div className="office-stat"><span className="os-val">{total_learners}</span><span className="os-lbl">Total Monitored</span></div>

        <div className="office-stat"><span className="os-val">{location_counts?.in_school || 0}</span><span className="os-lbl">In School</span></div>

        <div className="office-stat"><span className="os-val">{location_counts?.in_library || 0}</span><span className="os-lbl">In Library</span></div>

        <div className="office-stat"><span className="os-val">{learners_in_school?.length || 0}</span><span className="os-lbl">On Campus Now</span></div>

        <div className="office-stat"><span className="os-val">{on_exeat?.length || 0}</span><span className="os-lbl">Exeat Authorized</span></div>

        <div className="office-stat"><span className="os-val">{absent_day_scholars?.length || 0}</span><span className="os-lbl">Absent (Day)</span></div>

      </div>



      <div className="office-grid">

        <div className="ui-card">

          <h2 className="ui-card-title">Children On Campus</h2>

          {!learners_in_school?.length ? (

            <p className="empty-state">No learners on campus in this office scope.</p>

          ) : (

            <table className="office-table">

              <thead><tr><th>Name</th><th>Class</th><th>Type</th><th>Location</th><th>Last Scan</th></tr></thead>

              <tbody>

                {learners_in_school.map((l) => (

                  <tr key={l.id}>

                    <td><strong>{l.first_name} {l.last_name}</strong>{l.boarding_house && <small> ({l.boarding_house})</small>}</td>

                    <td>{l.class_name}</td>

                    <td><span className={`badge ${l.learner_type === 'boarding' ? 'badge-in-library' : 'badge-at-lunch'}`}>{l.learner_type}</span></td>

                    <td>{LOC_LABELS[l.current_location] || l.current_location}</td>

                    <td>{l.last_scan_at ? new Date(l.last_scan_at).toLocaleTimeString() : '—'}</td>

                  </tr>

                ))}

              </tbody>

            </table>

          )}

        </div>



        <div className="ui-card">

          <h2 className="ui-card-title">Today's Activity</h2>

          {!recent_scans_today?.length ? (

            <p className="empty-state">No scans today for this office.</p>

          ) : (

            <ul className="office-activity">

              {recent_scans_today.map((s) => (

                <li key={s.id}>

                  <strong>{s.first_name} {s.last_name}</strong> — {s.scan_type?.replace(/_/g, ' ')}

                  <span>{new Date(s.scanned_at).toLocaleTimeString()}</span>

                </li>

              ))}

            </ul>

          )}

        </div>

      </div>

    </div>

  );

}

