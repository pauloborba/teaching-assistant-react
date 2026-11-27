import React, { useEffect, useState } from 'react';
import { Class, getClassId } from '../types/Class';
import { LinhaDoRelatorio, getNomeDaTurma } from '../types/RelatorioRoteiro';
import { RoteiroItem } from '../types/Roteiro';
import RelatorioRoteiroService from '../services/RelatorioRoteiroService';
import { roteiroService } from '../services/RoteiroService';

interface RelatorioRoteiroProps {
  classes: Class[];
}

// Mostra o número sem casas decimais desnecessárias, ex.: 7 ou 7,5
const formatarNumero = (valor: number): string => {
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
};

const formatarDias = (valor: number): string => {
  return `${formatarNumero(valor)} ${valor === 1 ? 'dia' : 'dias'}`;
};

const RelatorioRoteiro: React.FC<RelatorioRoteiroProps> = ({ classes }) => {
  const [turmaAtualId, setTurmaAtualId] = useState<string>('');
  const [roteiro, setRoteiro] = useState<string>('');
  const [passadasIds, setPassadasIds] = useState<string[]>([]);
  const [linhas, setLinhas] = useState<LinhaDoRelatorio[]>([]);
  const [erro, setErro] = useState<string>('');
  const [roteiros, setRoteiros] = useState<RoteiroItem[]>([]);

  useEffect(() => {
    roteiroService
      .getAllRoteiros()
      .then(setRoteiros)
      .catch(() => setErro('Não foi possível carregar os roteiros.'));
  }, []);

  // Roteiros da turma atual (o título identifica o mesmo roteiro em outras turmas)
  const titulosDaTurmaAtual = Array.from(new Set(
    roteiros.filter(r => r.turmaIds.includes(turmaAtualId)).map(r => r.titulo)
  ));

  // Turmas passadas que também têm um roteiro com o título escolhido
  const turmasPassadas = classes.filter(c =>
    getClassId(c) !== turmaAtualId &&
    (!roteiro || roteiros.some(r => r.titulo === roteiro && r.turmaIds.includes(getClassId(c))))
  );

  const handlePassadaChange = (classId: string, marcada: boolean) => {
    if (marcada) {
      setPassadasIds([...passadasIds, classId]);
    } else {
      setPassadasIds(passadasIds.filter(id => id !== classId));
    }
  };

  const handleTurmaAtualChange = (classId: string) => {
    setTurmaAtualId(classId);
    setRoteiro('');
    setPassadasIds([]);
  };

  const handleRoteiroChange = (titulo: string) => {
    setRoteiro(titulo);
    setPassadasIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLinhas([]);

    try {
      // As turmas vão pelo id e o roteiro pelo título
      const resultado = await RelatorioRoteiroService.getRelatorio(turmaAtualId, roteiro, passadasIds);
      setLinhas(resultado);
    } catch (error) {
      setErro((error as Error).message);
    }
  };

  return (
    <div className="relatorio-roteiro-container">
      <h2 data-testid="titulo-pagina">Relatório de desempenho do roteiro</h2>

      <form onSubmit={handleSubmit} className="relatorio-roteiro-form">
        <div className="form-group">
          <label htmlFor="turma-atual">Turma atual:</label>
          <select
            id="turma-atual"
            name="turmaAtual"
            value={turmaAtualId}
            onChange={(e) => handleTurmaAtualChange(e.target.value)}
            required
          >
            <option value="">Selecione a turma</option>
            {classes.map(classObj => {
              const classId = getClassId(classObj);
              return (
                <option key={classId} value={classId}>
                  {getNomeDaTurma(classObj)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="roteiro">Roteiro:</label>
          <select
            id="roteiro"
            name="roteiro"
            value={roteiro}
            onChange={(e) => handleRoteiroChange(e.target.value)}
            disabled={!turmaAtualId}
            required
          >
            <option value="">Selecione o roteiro</option>
            {titulosDaTurmaAtual.map(titulo => (
              <option key={titulo} value={titulo}>{titulo}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <span className="relatorio-label">Turmas passadas para comparar:</span>
          {turmasPassadas.length === 0 ? (
            <p className="no-classes">Nenhuma outra turma com este roteiro.</p>
          ) : (
            <div className="turmas-passadas">
              {turmasPassadas.map(classObj => {
                const classId = getClassId(classObj);
                return (
                  <label key={classId} className="turma-passada">
                    <input
                      type="checkbox"
                      data-testid={`passada-${classId}`}
                      checked={passadasIds.includes(classId)}
                      onChange={(e) => handlePassadaChange(classId, e.target.checked)}
                    />
                    {getNomeDaTurma(classObj)}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="form-buttons">
          <button type="submit" className="submit-btn" data-testid="gerar-relatorio">
            Gerar relatório
          </button>
        </div>
      </form>

      {erro && (
        <div className="error-message" data-testid="mensagem-erro">
          {erro}
        </div>
      )}

      <div className="table-container">
        <table data-testid="tabela-relatorio">
          <thead>
            <tr>
              <th>Turma</th>
              <th>Média de acertos</th>
              <th>Média de erros</th>
              <th>Tempo de entrega médio</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(linha => (
              <tr key={linha.turma} data-testid="linha-relatorio">
                <td data-testid="linha-turma">{linha.turma}</td>
                <td data-testid="linha-acertos">{formatarNumero(linha.mediaAcertos)}</td>
                <td data-testid="linha-erros">{formatarNumero(linha.mediaErros)}</td>
                <td data-testid="linha-tempo">{formatarDias(linha.mediaTempoEntrega)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RelatorioRoteiro;
