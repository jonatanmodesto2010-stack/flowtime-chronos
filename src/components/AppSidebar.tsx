import { Calendar, Settings, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME, getFullVersion, BUILD_VERSION } from '@/config/version';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const menuItems = [
  { icon: Users, label: 'Clientes', path: '/clients' },
  { icon: Calendar, label: 'Calendário', path: '/calendar' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { open } = useSidebar();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        onClick={() => navigate(item.path)}
                        isActive={isActive(item.path)}
                        className="w-full"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {!open && (
                      <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          {open ? (
            <>
              <p className="font-semibold mb-1">{APP_NAME}</p>
              <p>{getFullVersion()}</p>
              <p className="text-[10px] opacity-70">Build: {BUILD_VERSION}</p>
            </>
          ) : (
            <p className="font-semibold text-center">v{BUILD_VERSION}</p>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
