import React, { useEffect, useState } from 'react';
import { Class } from '../types/Class';
import { ConfiguracaoLembretes, Lembrete } from '../types/Reminder';
import ReminderService from '../services/ReminderService';

interface ReminderSettingsProps {
  classInfo: Class;
  onBack: () => void;
}

interface ReminderDraft {
  id: string; // Preserva a identidade ao editar um lembrete existente.
  dateTime: string; // Valor local usado pelo campo datetime-local.
  estado: Lembrete['estado'];
}

const toDraft = (lembrete: Lembrete): ReminderDraft => {
  const instante = new Date(`${lembrete.data}T${lembrete.horario}:00.000Z`);
  const local = instante.getTime() - instante.getTimezoneOffset() * 60_000;
  return {
    id: lembrete.id,
    dateTime: new Date(local).toISOString().slice(0, 16),
    estado: lembrete.estado
  }; // Converte UTC para apresentação local sem alterar o instante agendado.
};

const formatInstant = (value: string): string => {
  const date = new Date(value);
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} às ${time}`;
};

const ReminderSettings: React.FC<ReminderSettingsProps> = ({ classInfo, onBack }) => {
  const [reminderCount, setReminderCount] = useState('');
  const [drafts, setDrafts] = useState<ReminderDraft[]>([]); // Mantém a edição separada da configuração confirmada.
  const [saved, setSaved] = useState<ConfiguracaoLembretes | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    let active = true; // Impede que uma consulta antiga atualize outra turma.
    setIsLoading(true);
    setSaved(null);
    setIsEditing(false); // A turma recém-aberta começa no modo de consulta.
    setReminderCount('');
    setDrafts([]);
    setSaveError('');
    setSaveSuccess('');

    const load = async () => {
      try {
        const configuration = await ReminderService.getConfiguration(classInfo.id);
        if (!active) return;
        setSaved(configuration);
        setReminderCount(String(configuration.lembretes.length));
        setDrafts(configuration.lembretes.map(toDraft));
      } catch (error) {
        if (active) setSaveError(error instanceof Error ? error.message : 'Não foi possível consultar os lembretes');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, [classInfo.id]);

  const clearFeedback = () => {
    setSaveError('');
    setSaveSuccess('');
  };

  const cancelEdit = () => {
    if (!saved) return;

    // Descarta o rascunho e recupera os valores da última configuração confirmada.
    setReminderCount(String(saved.lembretes.length));
    setDrafts(saved.lembretes.map(toDraft));
    clearFeedback();
    setIsEditing(false);
  };

  const handleCountChange = (value: string) => {
    setReminderCount(value);
    clearFeedback();
    const quantity = Number(value);
    if (!Number.isSafeInteger(quantity) || quantity < 0) return;
    setDrafts(previous => Array.from(
      { length: Math.max(quantity, previous.length) },
      (_, index) => previous[index] ?? { id: crypto.randomUUID(), dateTime: '', estado: 'Não enviado' }
    )); // Acrescenta identidades apenas para novos campos; reduzir a quantidade não apaga a edição imediatamente.
  };

  const handleDateChange = (index: number, value: string) => {
    clearFeedback();
    setDrafts(previous => previous.map((draft, position) =>
      position === index ? { ...draft, dateTime: value } : draft
    ));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isLoading || isSaving || !saved?.prazoAcademico) return;
    clearFeedback();
    setIsSaving(true);

    try {
      const quantity = Number(reminderCount);
      if (reminderCount.trim() === '' || !Number.isSafeInteger(quantity) || quantity < 0) {
        throw new Error('Informe uma quantidade inteira não negativa de lembretes');
      }
      const selected = drafts.slice(0, quantity);
      if (selected.length !== quantity || selected.some(draft =>
        !draft.dateTime || !Number.isFinite(new Date(draft.dateTime).getTime())
      )) {
        throw new Error(`Selecione exatamente ${quantity} datas e horários`);
      }

      const configuration = await ReminderService.saveConfiguration(classInfo.id, {
        quantidade: quantity,
        lembretes: selected.map(draft => {
          const iso = new Date(draft.dateTime).toISOString(); // Interpreta a entrada local e converte para UTC.
          return { id: draft.id, data: iso.slice(0, 10), horario: iso.slice(11, 16) };
        })
      }); // O servidor verifica datas, prazo e estados antes de gravar.

      setSaved(configuration);
      setReminderCount(String(configuration.lembretes.length));
      setDrafts(configuration.lembretes.map(toDraft));
      setIsEditing(false); // Volta ao resumo somente após o servidor aceitar a configuração.
      setSaveSuccess('Configuração salva com sucesso');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar os lembretes');
    } finally {
      setIsSaving(false);
    }
  };

  const count = Number(reminderCount);
  const visibleCount = Number.isSafeInteger(count) && count >= 0 ? count : 0;
  const showSavedOnly = (saved?.lembretes.length ?? 0) > 0 && !isEditing;

  return (
    <section aria-labelledby="reminder-settings-title">
      <h2 id="reminder-settings-title">Configuração de lembretes</h2>
      <p>Turma: <strong>{classInfo.year}.{classInfo.semester} de {classInfo.topic}</strong></p>
      {isLoading && <p role="status">Carregando lembretes…</p>}
      {saved && (
        <p>Prazo acadêmico da turma: <strong>
          {saved.prazoAcademico ? formatInstant(saved.prazoAcademico) : 'Não definido'}
        </strong></p>
      )}
      {saved && saved.prazoAcademico === null && (
        <p role="alert">Cadastre o prazo acadêmico deste ano e semestre e reabra a configuração de lembretes.</p>
      )}

      {!showSavedOnly && (
        <form onSubmit={handleSave}>
          <fieldset disabled={isLoading || isSaving || !saved?.prazoAcademico}>
            <legend>Quantidade, datas e horários</legend>
            <div className="form-group">
              <label htmlFor="reminder-count">Quantidade de lembretes</label>
              <input id="reminder-count" type="number" min={0} step={1} value={reminderCount}
                onChange={event => handleCountChange(event.target.value)} />
            </div>
            {drafts.slice(0, visibleCount).map((draft, index) => (
              <div className="form-group" key={draft.id}>
                <label htmlFor={`reminder-date-${index}`}>Data e horário do lembrete {index + 1}</label>
                <input id={`reminder-date-${index}`} type="datetime-local" value={draft.dateTime}
                  disabled={draft.estado !== 'Não enviado' && draft.estado !== 'Agendado'}
                  onChange={event => handleDateChange(index, event.target.value)} />
              </div>
            ))}
            <div className="form-buttons">
              <button type="submit">{isSaving ? 'Salvando…' : 'Salvar configuração'}</button>
              {isEditing && (
                <button type="button" onClick={cancelEdit}>Cancelar edição</button>
              )}
            </div>
          </fieldset>{/* Bloqueia alterações durante consulta ou gravação; estados protegidos também têm seus campos bloqueados. */}
        </form>
      )}

      {saveError && <p role="alert">{saveError}</p>}
      {saveSuccess && <p role="status">{saveSuccess}</p>}
      {saved && (
        <section aria-labelledby="saved-reminders-title" className={showSavedOnly ? 'reminder-saved-card' : undefined}>
          <h3 id="saved-reminders-title">Configuração salva</h3>
          <p>Quantidade de lembretes: {saved.lembretes.length}</p>
          <ol>
            {saved.lembretes.map(lembrete => (
              <li key={lembrete.id}>{formatInstant(`${lembrete.data}T${lembrete.horario}:00.000Z`)}</li>
            ))}
          </ol>
          {showSavedOnly && (
            <button type="button" disabled={!saved.prazoAcademico} onClick={() => {
              clearFeedback();
              setIsEditing(true); // Abre o formulário preenchido com a configuração salva.
            }}>
              Editar lembretes
            </button>
          )}
        </section>
      )}
      <button type="button" disabled={isSaving} onClick={onBack}>Voltar para turmas</button>
    </section>
  );
};

export default ReminderSettings;
