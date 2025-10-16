import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface FilterValues {
  searchTerm: string;
  statusFilter: string;
  tagsFilter: string[];
  dateFrom: string;
  dateTo: string;
  updateDateFrom: string;
  updateDateTo: string;
  boletoFilter: string;
  timelineFilter: string;
}

interface ClientSearchFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
  organizationId: string | null;
}

export const ClientSearchFilters = ({ onFilterChange, organizationId }: ClientSearchFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagsFilter, setTagsFilter] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [updateDateFrom, setUpdateDateFrom] = useState('');
  const [updateDateTo, setUpdateDateTo] = useState('');
  const [boletoFilter, setBoletoFilter] = useState('all');
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [tags, setTags] = useState<Tag[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (organizationId) {
      loadTags();
    }
  }, [organizationId]);

  const loadTags = async () => {
    if (!organizationId) return;

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name');

    if (!error && data) {
      setTags(data);
    }
  };

  const applyFilters = () => {
    onFilterChange({
      searchTerm,
      statusFilter,
      tagsFilter,
      dateFrom,
      dateTo,
      updateDateFrom,
      updateDateTo,
      boletoFilter,
      timelineFilter,
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTagsFilter([]);
    setDateFrom('');
    setDateTo('');
    setUpdateDateFrom('');
    setUpdateDateTo('');
    setBoletoFilter('all');
    setTimelineFilter('all');
    onFilterChange({
      searchTerm: '',
      statusFilter: 'all',
      tagsFilter: [],
      dateFrom: '',
      dateTo: '',
      updateDateFrom: '',
      updateDateTo: '',
      boletoFilter: 'all',
      timelineFilter: 'all',
    });
  };

  const toggleTag = (tagId: string) => {
    setTagsFilter(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const activeFiltersCount = [
    statusFilter !== 'all',
    tagsFilter.length > 0,
    dateFrom || dateTo,
    updateDateFrom || updateDateTo,
    boletoFilter !== 'all',
    timelineFilter !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 mb-6">
      {/* Search Bar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar por nome ou ID do cliente..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              applyFilters();
            }}
            className="pl-10 flex-1"
          />
        </div>
        <Popover open={showFilters} onOpenChange={setShowFilters}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative shrink-0">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge className="ml-2 bg-primary text-primary-foreground px-1.5 py-0.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px]" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Filtros Avançados</h4>
                {activeFiltersCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {tags.map(tag => (
                      <Badge
                        key={tag.id}
                        style={{
                          backgroundColor: tagsFilter.includes(tag.id) ? tag.color : 'transparent',
                          borderColor: tag.color,
                          color: tagsFilter.includes(tag.id) ? 'white' : tag.color
                        }}
                        className="cursor-pointer border-2 transition-all hover:scale-105"
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Period */}
              <div>
                <label className="text-sm font-medium mb-2 block">Período de Cadastro</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      placeholder="De"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      placeholder="Até"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Data de Atualização */}
              <div>
                <label className="text-sm font-medium mb-2 block">Data de Atualização</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      type="date"
                      value={updateDateFrom}
                      onChange={(e) => setUpdateDateFrom(e.target.value)}
                      placeholder="De"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      value={updateDateTo}
                      onChange={(e) => setUpdateDateTo(e.target.value)}
                      placeholder="Até"
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Boletos */}
              <div>
                <label className="text-sm font-medium mb-2 block">Boletos</label>
                <Select value={boletoFilter} onValueChange={setBoletoFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Com boletos pendentes</SelectItem>
                    <SelectItem value="paid">Com boletos pagos</SelectItem>
                    <SelectItem value="none">Sem boletos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Timeline */}
              <div>
                <label className="text-sm font-medium mb-2 block">Timeline</label>
                <Select value={timelineFilter} onValueChange={setTimelineFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="with_events">Com eventos</SelectItem>
                    <SelectItem value="no_events">Sem eventos</SelectItem>
                    <SelectItem value="with_analysis">Com análise de risco</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Apply Button */}
              <Button onClick={() => { applyFilters(); setShowFilters(false); }} className="w-full">
                Aplicar Filtros
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {statusFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter === 'active' ? 'Ativos' : 'Inativos'}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setStatusFilter('all')}
              />
            </Badge>
          )}
          {tagsFilter.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              {tagsFilter.length} tag(s)
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setTagsFilter([])}
              />
            </Badge>
          )}
          {(dateFrom || dateTo) && (
            <Badge variant="secondary" className="gap-1">
              Cadastro: {dateFrom || '...'} até {dateTo || '...'}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => { setDateFrom(''); setDateTo(''); applyFilters(); }}
              />
            </Badge>
          )}
          {(updateDateFrom || updateDateTo) && (
            <Badge variant="secondary" className="gap-1">
              Atualização: {updateDateFrom || '...'} até {updateDateTo || '...'}
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => { setUpdateDateFrom(''); setUpdateDateTo(''); applyFilters(); }}
              />
            </Badge>
          )}
          {boletoFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Boletos
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setBoletoFilter('all')}
              />
            </Badge>
          )}
          {timelineFilter !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Timeline
              <X
                className="w-3 h-3 cursor-pointer"
                onClick={() => setTimelineFilter('all')}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
