import React, { useState } from 'react';
import { Grade, DEFAULT_DEFMEDIA, DefMedia } from '../types/DefMedia';

interface DefMediaProps {
  defMedia: DefMedia;
  onChange: (newDefMedia: DefMedia) => void;
  onClose: () => void;
  mediaType: 'arithmetic' | 'weighted';
  setMediaType: (t: 'arithmetic' | 'weighted') => void;
}

const DefMediaModal: React.FC<DefMediaProps> = ({ defMedia, onChange, onClose, mediaType, setMediaType }) => {
  const [ma, setMa] = useState<number | ''>(defMedia.conceitoPeso.get('MA') ?? 10);
  const [mpa, setMpa] = useState<number | ''>(defMedia.conceitoPeso.get('MPA') ?? 7);
  const [mana, setMana] = useState<number | ''>(defMedia.conceitoPeso.get('MANA') ?? 4);
  const [metaWeights, setMetaWeights] = useState<Record<string, number | ''>>(() => {
    const obj: Record<string, number | ''> = {};
    defMedia.metaPeso.forEach((value, key) => { obj[key] = value; });
    return obj;
  });
  const [error, setError] = useState<string>('');

  const validate = () => {
    if (ma === '' || mpa === '' || mana === '') {
      setError('Preencha todos os pesos de conceito (MA, MPA, MANA).');
      return false;
    }
    if ((ma as number) <= 0 || (mpa as number) <= 0 || (mana as number) <= 0) {
      setError('Pesos devem ser maiores que 0.');
      return false;
    }
    if (mediaType === 'weighted') {
      const metas = Object.values(metaWeights);
      if (metas.some(v => v === '' || (v as number) <= 0)) {
        setError('Preencha todos os pesos das metas (maiores que 0).');
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleSave = () => {
    if (!validate()) return;

    const newDefMedia: DefMedia = {
      conceitoPeso: new Map<Grade, number>([
        ['MA', Number(ma)],
        ['MPA', Number(mpa)],
        ['MANA', Number(mana)],
      ]),
      metaPeso: new Map(Object.entries(metaWeights).map(([k, v]) => [k, Number(v)])),
    };

    onChange(newDefMedia);
    onClose();
  };

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-box" onClick={stopPropagation}>
        <h3 className="modal-title">Configure Weights</h3>
        {error && <div className="modal-error">{error}</div>}

        {/* Media Type */}
        <div className="form-group">
          <label className="form-label">Media Type</label>
            <select
              value={mediaType}
              onChange={(e) => {
                const value = e.target.value as 'arithmetic' | 'weighted';
                setMediaType(value);

                if (value === 'arithmetic') {
                  const metasResets: Record<string, number> = {};
                  Object.keys(metaWeights).forEach(k => metasResets[k] = 1);
                  setMetaWeights(metasResets);
                }
              }}
              className="form-control"
            >
            <option value="arithmetic">Arithmetic</option>
            <option value="weighted">Weighted</option>
          </select>
        </div>

        {/* Concept Weights */}
        <div className="form-group">
          <label className="form-label">Concept Weights</label>
          <div className="grid-3">
            {/* MA */}
            <div className="input-with-label">
              <span className="input-label">MA</span>
              <input
                type="number"
                min={1}
                value={ma}
                onChange={(e) => setMa(e.target.value === '' ? '' : Number(e.target.value))}
                className="form-control"
              />
            </div>
            {/* MPA */}
            <div className="input-with-label">
              <span className="input-label">MPA</span>
              <input
                type="number"
                min={1}
                value={mpa}
                onChange={(e) => setMpa(e.target.value === '' ? '' : Number(e.target.value))}
                className="form-control"
              />
            </div>
            {/* MANA */}
            <div className="input-with-label">
              <span className="input-label">MANA</span>
              <input
                type="number"
                min={1}
                value={mana}
                onChange={(e) => setMana(e.target.value === '' ? '' : Number(e.target.value))}
                className="form-control"
              />
            </div>
          </div>
        </div>

        {/* Meta Weights */}
        {mediaType === 'weighted' && (
          <div className="form-group">
            <label className="form-label">Meta Weights</label>
            <div className="grid-2">
              {Object.keys(metaWeights).map((meta) => (
                <div key={meta} className="input-with-label">
                  <span className="input-label">{meta}</span>
                  <input
                    type="number"
                    min={1}
                    value={metaWeights[meta]}
                    onChange={(e) =>
                      setMetaWeights((prev) => ({
                        ...prev,
                        [meta]: e.target.value === '' ? '' : Number(e.target.value)
                      }))
                    }
                    className="form-control"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-buttons">
          <button className="btn cancel-btn" onClick={onClose}>Cancel</button>
          <button className="btn submit-btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
};

export default DefMediaModal;
