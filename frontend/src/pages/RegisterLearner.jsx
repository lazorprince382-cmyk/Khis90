import { useState } from 'react';
import { api } from '../services/api';
import { IconCard } from '../components/Icons';
import './RegisterLearner.css';

function FieldControl({ icon, children, className = '' }) {
  return (
    <div className={`reg-control ${className}`}>
      <span className="reg-field-icon">{icon}</span>
      {children}
    </div>
  );
}

export default function RegisterLearner() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', class_name: '', date_of_birth: '',
    parent_phone: '', parent_email: '', learner_type: 'day', section: '', boarding_house: '',
    registration_number: '', card_expires_at: '',
  });
  const [photo, setPhoto] = useState(null);
  const [learner, setLearner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLearner(null);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      if (photo) payload.append('photo', photo);
      const result = await api.registerLearner(payload);
      setLearner(result.learner);
      setForm({
        first_name: '', last_name: '', class_name: '', date_of_birth: '',
        parent_phone: '', parent_email: '', learner_type: 'day', section: '', boarding_house: '',
        registration_number: '', card_expires_at: '',
      });
      setPhoto(null);
    } catch (err) {
      setError(err.error || err.message || 'Failed to register learner.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-hero">
        <div className="register-hero-icon">+</div>
        <div>
          <h1>Register New Learner</h1>
          <p>Fill in the details below to register a new learner in the system.</p>
        </div>
      </div>

      <div className="register-shell">
        {error && <div className="alert-error">{error}</div>}
        {learner && <div className="alert-success">Learner registered successfully.</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Registration Number <span>*</span></label>
              <FieldControl icon="ID">
                <input name="registration_number" value={form.registration_number} onChange={handleChange} placeholder="e.g. KIS/2026/001" required />
              </FieldControl>
            </div>
            <div className="form-group">
              <label>Card Expiry Date</label>
              <FieldControl icon="CAL">
                <input name="card_expires_at" type="date" value={form.card_expires_at} onChange={handleChange} />
              </FieldControl>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>First Name <span>*</span></label>
              <FieldControl icon="USR">
                <input name="first_name" value={form.first_name} onChange={handleChange} placeholder="Enter first name" required />
              </FieldControl>
            </div>
            <div className="form-group">
              <label>Last Name <span>*</span></label>
              <FieldControl icon="USR">
                <input name="last_name" value={form.last_name} onChange={handleChange} placeholder="Enter last name" required />
              </FieldControl>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Scholar Type <span>*</span></label>
              <FieldControl icon="CAP">
                <select name="learner_type" value={form.learner_type} onChange={handleChange}>
                  <option value="day">Day Scholar</option>
                  <option value="boarding">Boarding Scholar</option>
                </select>
              </FieldControl>
            </div>
            <div className="form-group">
              <label>Section</label>
              <FieldControl icon="BLD">
                <select name="section" value={form.section} onChange={handleChange}>
                  <option value="">Select section...</option>
                  <option value="Early Years">Early Years</option>
                  <option value="Primary">Primary</option>
                  <option value="High School">High School</option>
                </select>
              </FieldControl>
            </div>
          </div>

          <div className="form-group">
            <label>Class <span>*</span></label>
            <FieldControl icon="BK">
              <select name="class_name" value={form.class_name} onChange={handleChange} required>
                <option value="">Select class...</option>
                <optgroup label="High School">
                  {['Year 7','Year 8','Year 9','Year 10','Year 11','Year 12','Year 13'].map((c) => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="Primary">
                  {['KG1','KG2','G1','G2','G3','G4','G5'].map((c) => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </FieldControl>
          </div>

          {form.learner_type === 'boarding' && (
            <div className="form-group">
              <label>Boarding House</label>
              <FieldControl icon="HS">
                <input name="boarding_house" value={form.boarding_house} onChange={handleChange} placeholder="e.g. Boys House" />
              </FieldControl>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Date of Birth</label>
              <FieldControl icon="CAL">
                <input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} />
              </FieldControl>
            </div>
            <div className="form-group">
              <label>Parent Phone</label>
              <FieldControl icon="TEL" className="phone-control">
                <span className="phone-prefix">+256</span>
                <input name="parent_phone" type="tel" value={form.parent_phone} onChange={handleChange} placeholder="7XX XXX XXX" />
              </FieldControl>
            </div>
          </div>

          <div className="form-group">
            <label>Parent Email</label>
            <FieldControl icon="MAIL">
              <input name="parent_email" type="email" value={form.parent_email} onChange={handleChange} placeholder="parent@email.com" />
            </FieldControl>
          </div>

          <div className="form-group">
            <label>Passport Photo</label>
            <label className="photo-drop">
              <span className="photo-drop-icon">UP</span>
              <span className="photo-drop-copy">
                <strong>{photo ? photo.name : 'Choose file'} <em>or drag & drop</em></strong>
                <small>JPG, PNG or JPEG (Max. 2MB)</small>
              </span>
              <span className="photo-browse">Browse File</span>
              <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0] || null)} />
            </label>
          </div>

          <button type="submit" className="btn btn-primary btn-register" disabled={loading}>
            <IconCard /> {loading ? 'Registering...' : 'Register & Generate ID Card'}
          </button>
        </form>
      </div>
    </div>
  );
}
