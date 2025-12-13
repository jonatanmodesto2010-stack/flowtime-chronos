import { Calendar, Settings, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { APP_NAME, getFullVersion, BUILD_VERSION } from '@/config/version';
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
const menuItems = [{
  icon: Users,
  label: 'Clientes',
  path: '/clients'
}, {
  icon: Calendar,
  label: 'Calendário',
  path: '/calendar'
}, {
  icon: Settings,
  label: 'Configurações',
  path: '/settings'
}];
export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    open
  } = useSidebar();
  const isActive = (path: string) => location.pathname === path;
  return <Sidebar collapsible="icon">
      <SidebarContent className="mx-0">
        <SidebarGroup>
          <SidebarGroupLabel>​ </SidebarGroupLabel>
          <SidebarGroupContent className="my-[28px]">
            <SidebarMenu className="my-[26px]">
              {menuItems.map(item => <SidebarMenuItem key={item.path}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton onClick={() => navigate(item.path)} isActive={isActive(item.path)} className="w-full">
                        <item.icon className="w-[20px] h-[20px]" />
                        <span className="text-xl">{item.label}</span>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {!open && <TooltipContent side="right">
                        <p>{item.label}</p>
                      </TooltipContent>}
                  </Tooltip>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-4 border-t border-border text-xs text-muted-foreground">
          {open ? <>
              <p className="font-semibold mb-1">{APP_NAME}</p>
              <p>{getFullVersion()}</p>
              <p className="text-[10px] opacity-70">Build: {BUILD_VERSION}</p>
            </> : <p className="font-semibold text-center">v{BUILD_VERSION}</p>}
        </div>
      </SidebarFooter>
    </Sidebar>;
}