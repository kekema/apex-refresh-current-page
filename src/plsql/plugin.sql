function render 
  ( p_dynamic_action in apex_plugin.t_dynamic_action
  , p_plugin         in apex_plugin.t_plugin )
return apex_plugin.t_dynamic_action_render_result
as

l_result                    apex_plugin.t_dynamic_action_render_result;
l_internal_region_id        apex_application_page_regions.region_id%type;
l_maximum_rows_to_query     apex_application_page_regions.maximum_rows_to_query%type;

begin
    if apex_application.g_debug then
        apex_plugin_util.debug_dynamic_action(p_plugin         => p_plugin,
                                              p_dynamic_action => p_dynamic_action);
    end if;    

    -- get internal region id
    select affected_region_id
    into l_internal_region_id
    from apex_application_page_da_acts
    where action_id = p_dynamic_action.id;  

    if (l_internal_region_id is not null) then
        -- get max number of rows to query (used for CR regions)
        select maximum_rows_to_query
        into l_maximum_rows_to_query
        from apex_application_page_regions reg
        where reg.region_id = l_internal_region_id;
    end if;

    apex_javascript.add_library(
          p_name      => 'region-refreshcurpage',
          p_check_to_add_minified => true,
          p_directory => p_plugin.file_prefix || 'js/',
          p_version   => NULL
    ); 

    l_result.javascript_function := 'lib4x.axt.region.refreshCurrentPage._execute';
    l_result.ajax_identifier     := apex_plugin.get_ajax_identifier;
    l_result.attribute_01        := l_internal_region_id;    
    l_result.attribute_02        := l_maximum_rows_to_query;                     
                       
    return l_result;
    
end render;
