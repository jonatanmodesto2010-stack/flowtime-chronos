/**
 * Biblioteca centralizada para manipulação de datas
 * 
 * Padrões:
 * - Armazenamento: ISO (YYYY-MM-DD)
 * - Exibição: Brasileiro (DD/MM/YYYY)
 * - Eventos: Dia/Mês sem ano (DD/MM)
 */

/**
 * Converte data ISO (YYYY-MM-DD) para formato brasileiro (DD/MM/YYYY)
 */
export function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate || isoDate === '--/--') {
    return 'Data não definida';
  }

  try {
    // Se já estiver no formato brasileiro, retornar como está
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(isoDate)) {
      return isoDate;
    }

    // Se for ISO, converter
    if (/^\d{4}-\d{2}-\d{2}/.test(isoDate)) {
      const date = new Date(isoDate + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR');
      }
    }

    return 'Data não definida';
  } catch (error) {
    console.error('Erro ao formatar data BR:', error);
    return 'Data não definida';
  }
}

/**
 * Converte Date para formato DD/MM (sem ano) para eventos
 */
export function formatEventDate(date: Date): string {
  try {
    if (!date || isNaN(date.getTime())) {
      return '--/--';
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch (error) {
    console.error('Erro ao formatar data de evento:', error);
    return '--/--';
  }
}

/**
 * Converte DD/MM para Date (usando ano atual)
 */
export function parseEventDate(ddmm: string): Date | null {
  if (!ddmm || ddmm === '--/--') {
    return null;
  }

  try {
    const parts = ddmm.trim().split('/');
    if (parts.length < 2) {
      return null;
    }

    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parts.length === 3 ? parseInt(parts[2]) : new Date().getFullYear();

    if (isNaN(day) || isNaN(month) || day < 1 || day > 31 || month < 0 || month > 11) {
      return null;
    }

    const date = new Date(year, month, day);
    
    // Validar se a data é válida
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    console.error('Erro ao parsear data de evento:', error);
    return null;
  }
}

/**
 * Converte DD/MM/YYYY para Date
 */
export function parseDateBR(ddmmyyyy: string): Date | null {
  if (!ddmmyyyy || ddmmyyyy === '--/--') {
    return null;
  }

  try {
    const parts = ddmmyyyy.trim().split('/');
    if (parts.length !== 3) {
      return null;
    }

    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);

    if (isNaN(day) || isNaN(month) || isNaN(year) || 
        day < 1 || day > 31 || month < 0 || month > 11 || year < 1900) {
      return null;
    }

    const date = new Date(year, month, day);
    
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch (error) {
    console.error('Erro ao parsear data brasileira:', error);
    return null;
  }
}

/**
 * Valida se uma string representa uma data válida
 */
export function isValidDateString(dateStr: string): boolean {
  if (!dateStr || dateStr === '--/--') {
    return false;
  }

  // Tenta parsear como DD/MM ou DD/MM/YYYY
  const eventDate = parseEventDate(dateStr);
  if (eventDate) {
    return true;
  }

  // Tenta parsear como DD/MM/YYYY
  const brDate = parseDateBR(dateStr);
  if (brDate) {
    return true;
  }

  // Tenta parsear como ISO
  try {
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Converte Date para formato ISO (YYYY-MM-DD) para armazenar no banco
 */
export function toISODate(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) {
    return '';
  }

  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('Erro ao converter para ISO:', error);
    return '';
  }
}

/**
 * Normaliza qualquer formato de data para exibição em formato brasileiro
 * Esta é a função universal para exibir datas ao usuário
 */
export function normalizeDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr || dateStr === '--/--') {
    return 'Data não definida';
  }

  try {
    // Se já estiver no formato DD/MM ou DD/MM/YYYY, retornar como está
    if (/^\d{1,2}\/\d{1,2}(\/\d{4})?$/.test(dateStr)) {
      return dateStr;
    }

    // Se for formato ISO (YYYY-MM-DD), converter para DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const date = new Date(dateStr + 'T00:00:00');
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR');
      }
    }

    // Caso não reconheça o formato, retornar a string original
    return dateStr;
  } catch (error) {
    console.error('Erro ao normalizar data:', error);
    return dateStr;
  }
}

/**
 * Converte string ISO datetime completo para formato brasileiro com hora
 * Exemplo: "2024-01-15T14:30:00" -> "15/01/2024 14:30"
 */
export function formatDateTimeBR(isoDateTime: string | null | undefined): string {
  if (!isoDateTime) {
    return 'Data não definida';
  }

  try {
    const date = new Date(isoDateTime);
    if (isNaN(date.getTime())) {
      return 'Data não definida';
    }

    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Erro ao formatar datetime BR:', error);
    return 'Data não definida';
  }
}
