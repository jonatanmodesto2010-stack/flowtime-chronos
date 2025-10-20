import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface ColorPalette {
  id: string;
  name: string;
  description: string;
  preview: {
    background: string;
    primary: string;
    secondary: string;
    accent: string;
  };
  cssVars: {
    light: Record<string, string>;
    dark: Record<string, string>;
  };
}

const COLOR_PALETTES: ColorPalette[] = [
  {
    id: 'green',
    name: 'Verde Sustentável',
    description: 'Paleta verde atual do sistema',
    preview: {
      background: 'hsl(0 0% 98%)',
      primary: 'hsl(146 50% 36%)',
      secondary: 'hsl(142 52% 50%)',
      accent: 'hsl(120 61% 34%)',
    },
    cssVars: {
      light: {
        '--background': '0 0% 98%',
        '--foreground': '150 50% 15%',
        '--primary': '146 50% 36%',
        '--primary-foreground': '0 0% 100%',
        '--secondary': '142 52% 50%',
        '--secondary-foreground': '0 0% 100%',
        '--accent': '120 61% 34%',
        '--accent-foreground': '0 0% 100%',
        '--card': '0 0% 100%',
        '--card-foreground': '150 50% 15%',
        '--muted': '210 40% 96.1%',
        '--muted-foreground': '215.4 16.3% 46.9%',
        '--border': '214.3 31.8% 91.4%',
        '--input': '214.3 31.8% 91.4%',
        '--ring': '146 50% 36%',
      },
      dark: {
        '--background': '150 20% 8%',
        '--foreground': '150 20% 95%',
        '--primary': '146 50% 45%',
        '--primary-foreground': '0 0% 100%',
        '--secondary': '142 52% 55%',
        '--secondary-foreground': '0 0% 100%',
        '--accent': '120 61% 40%',
        '--accent-foreground': '0 0% 100%',
        '--card': '150 15% 12%',
        '--card-foreground': '150 20% 95%',
        '--muted': '150 15% 20%',
        '--muted-foreground': '150 10% 60%',
        '--border': '150 15% 20%',
        '--input': '150 15% 20%',
        '--ring': '146 50% 45%',
      },
    },
  },
  {
    id: 'blue',
    name: 'Azul Profissional',
    description: 'Paleta azul corporativa',
    preview: {
      background: 'hsl(210 40% 98%)',
      primary: 'hsl(217 91% 60%)',
      secondary: 'hsl(213 94% 68%)',
      accent: 'hsl(220 90% 56%)',
    },
    cssVars: {
      light: {
        '--background': '210 40% 98%',
        '--foreground': '217 33% 17%',
        '--primary': '217 91% 60%',
        '--primary-foreground': '0 0% 100%',
        '--secondary': '213 94% 68%',
        '--secondary-foreground': '0 0% 100%',
        '--accent': '220 90% 56%',
        '--accent-foreground': '0 0% 100%',
        '--card': '0 0% 100%',
        '--card-foreground': '217 33% 17%',
        '--muted': '210 40% 96.1%',
        '--muted-foreground': '215.4 16.3% 46.9%',
        '--border': '214.3 31.8% 91.4%',
        '--input': '214.3 31.8% 91.4%',
        '--ring': '217 91% 60%',
      },
      dark: {
        '--background': '217 33% 8%',
        '--foreground': '210 40% 95%',
        '--primary': '217 91% 65%',
        '--primary-foreground': '0 0% 100%',
        '--secondary': '213 94% 73%',
        '--secondary-foreground': '0 0% 100%',
        '--accent': '220 90% 61%',
        '--accent-foreground': '0 0% 100%',
        '--card': '217 33% 12%',
        '--card-foreground': '210 40% 95%',
        '--muted': '217 33% 20%',
        '--muted-foreground': '217 20% 60%',
        '--border': '217 33% 20%',
        '--input': '217 33% 20%',
        '--ring': '217 91% 65%',
      },
    },
  },
  {
    id: 'purple',
    name: 'Roxo Criativo',
    description: 'Paleta roxa moderna',
    preview: {
      background: 'hsl(270 30% 98%)',
      primary: 'hsl(271 81% 56%)',
      secondary: 'hsl(280 89% 60%)',
      accent: 'hsl(262 83% 58%)',
    },
    cssVars: {
      light: {
        '--background': '270 30% 98%',
        '--foreground': '271 36% 17%',
        '--primary': '271 81% 56%',
        '--primary-foreground': '0 0% 100%',
        '--secondary': '280 89% 60%',
        '--secondary-foreground': '0 0% 100%',
        '--accent': '262 83% 58%',
        '--accent-foreground': '0 0% 100%',
        '--card': '0 0% 100%',
        '--card-foreground': '271 36% 17%',
        '--muted': '270 30% 96.1%',
        '--muted-foreground': '271 20% 46.9%',
        '--border': '270 30% 91.4%',
        '--input': '270 30% 91.4%',
        '--ring': '271 81% 56%',
      },
      dark: {
        '--background': '271 36% 8%',
        '--foreground': '270 30% 95%',
        '--primary': '271 81% 61%',
        '--primary-foreground': '0 0% 100%',
        '--secondary': '280 89% 65%',
        '--secondary-foreground': '0 0% 100%',
        '--accent': '262 83% 63%',
        '--accent-foreground': '0 0% 100%',
        '--card': '271 36% 12%',
        '--card-foreground': '270 30% 95%',
        '--muted': '271 36% 20%',
        '--muted-foreground': '271 20% 60%',
        '--border': '271 36% 20%',
        '--input': '271 36% 20%',
        '--ring': '271 81% 61%',
      },
    },
  },
  {
    id: 'orange',
    name: 'Laranja Energético',
    description: 'Paleta laranja vibrante',
    preview: {
      background: 'hsl(30 40% 98%)',
      primary: 'hsl(25 95% 53%)',
      secondary: 'hsl(33 100% 60%)',
      accent: 'hsl(20 90% 48%)',
    },
    cssVars: {
      light: {
        '--background': '30 40% 98%',
        '--foreground': '25 45% 17%',
        '--primary': '25 95% 53%',
        '--primary-foreground': '0 0% 100%',
        '--secondary': '33 100% 60%',
        '--secondary-foreground': '0 0% 100%',
        '--accent': '20 90% 48%',
        '--accent-foreground': '0 0% 100%',
        '--card': '0 0% 100%',
        '--card-foreground': '25 45% 17%',
        '--muted': '30 40% 96.1%',
        '--muted-foreground': '30 20% 46.9%',
        '--border': '30 40% 91.4%',
        '--input': '30 40% 91.4%',
        '--ring': '25 95% 53%',
      },
      dark: {
        '--background': '25 45% 8%',
        '--foreground': '30 40% 95%',
        '--primary': '25 95% 58%',
        '--primary-foreground': '0 0% 100%',
        '--secondary': '33 100% 65%',
        '--secondary-foreground': '0 0% 100%',
        '--accent': '20 90% 53%',
        '--accent-foreground': '0 0% 100%',
        '--card': '25 45% 12%',
        '--card-foreground': '30 40% 95%',
        '--muted': '25 45% 20%',
        '--muted-foreground': '25 30% 60%',
        '--border': '25 45% 20%',
        '--input': '25 45% 20%',
        '--ring': '25 95% 58%',
      },
    },
  },
];

export const ColorThemeSettings = () => {
  const [selectedPalette, setSelectedPalette] = useState<string>(() => {
    return localStorage.getItem('colorPalette') || 'green';
  });

  const applyPalette = (palette: ColorPalette) => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const vars = isDark ? palette.cssVars.dark : palette.cssVars.light;

    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    localStorage.setItem('colorPalette', palette.id);
    setSelectedPalette(palette.id);
  };

  // Aplicar paleta salva ao carregar
  useEffect(() => {
    const savedPaletteId = localStorage.getItem('colorPalette');
    if (savedPaletteId) {
      const palette = COLOR_PALETTES.find(p => p.id === savedPaletteId);
      if (palette) {
        applyPalette(palette);
      }
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Paleta de Cores</CardTitle>
        <CardDescription>
          Escolha a paleta de cores do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {COLOR_PALETTES.map((palette) => (
            <div
              key={palette.id}
              className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                selectedPalette === palette.id
                  ? 'border-primary shadow-lg'
                  : 'border-border hover:border-muted-foreground'
              }`}
              onClick={() => applyPalette(palette)}
            >
              {selectedPalette === palette.id && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary-foreground" />
                </div>
              )}

              <h3 className="font-semibold mb-1">{palette.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">
                {palette.description}
              </p>

              <div className="flex gap-2">
                <div
                  className="w-10 h-10 rounded border"
                  style={{ backgroundColor: palette.preview.background }}
                  title="Background"
                />
                <div
                  className="w-10 h-10 rounded border"
                  style={{ backgroundColor: palette.preview.primary }}
                  title="Primary"
                />
                <div
                  className="w-10 h-10 rounded border"
                  style={{ backgroundColor: palette.preview.secondary }}
                  title="Secondary"
                />
                <div
                  className="w-10 h-10 rounded border"
                  style={{ backgroundColor: palette.preview.accent }}
                  title="Accent"
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
