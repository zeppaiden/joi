-- Create function to handle ticket unassignment
CREATE OR REPLACE FUNCTION public.handle_organization_member_removal()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all tickets assigned to this user in this organization
    UPDATE public.tickets
    SET 
        assigned_to = NULL,
        updated_at = NOW()
    WHERE 
        assigned_to = OLD.user_id 
        AND organization_id = OLD.organization_id;

    -- Return the trigger result
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_organization_member_removal ON public.organization_members;
CREATE TRIGGER on_organization_member_removal
    AFTER DELETE ON public.organization_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_organization_member_removal();

-- Add comment to explain the trigger
COMMENT ON TRIGGER on_organization_member_removal ON public.organization_members IS 
'Automatically unassigns tickets from an agent when they are removed from an organization';

-- Add comment to explain the function
COMMENT ON FUNCTION public.handle_organization_member_removal() IS 
'Handles unassigning tickets when an agent is removed from an organization';
