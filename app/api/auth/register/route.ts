import { NextResponse } from 'next/server';
import { registrationSchema } from '@/schemas/auth';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const json = await req.json();
    console.log('Registration request payload:', json);
    
    // Validate request body
    const { role, organizationName, inviteCode } = registrationSchema.parse(json);
    console.log('Validated registration data:', { role, organizationName, inviteCode });
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Auth user error:', userError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    if (!user) {
      console.error('No authenticated user found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.log('Authenticated user:', { id: user.id, email: user.email });

    // Get or create user record
    let { data: dbUser, error: getUserError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (getUserError) {
      console.error('Error fetching user:', getUserError);
    }

    // If no user record exists, create one
    if (!dbUser) {
      console.log('Creating new user record for:', user.id);
      const { error: createError } = await supabase.from('users').insert({
        id: user.id,
        email: user.email!,
        role
      });

      if (createError) {
        console.error('User creation error:', createError);
        return NextResponse.json(
          { error: 'Failed to create user' },
          { status: 500 }
        );
      }

      // Get the newly created user
      const { data: newUser, error: newUserError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (newUserError) {
        console.error('Error fetching new user:', newUserError);
      }
      console.log('New user created:', newUser);
      dbUser = newUser;
    } else {
      console.log('Existing user found:', dbUser);
    }

    // Handle role-specific logic
    if (role === 'admin') {
      console.log('Processing admin registration');
      if (!organizationName) {
        console.error('Missing organization name for admin');
        return NextResponse.json(
          { error: 'Organization name required for admin role' },
          { status: 400 }
        );
      }

      // Start a transaction for organization creation
      console.log('Creating organization:', { name: organizationName, admin_id: user.id });
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: organizationName,
          admin_id: user.id
        })
        .select('id')
        .single();

      if (orgError) {
        console.error('Organization creation error:', {
          message: orgError.message,
          details: orgError.details,
          hint: orgError.hint,
          code: orgError.code
        });
        return NextResponse.json(
          { error: `Failed to create organization: ${orgError.message}` },
          { status: 500 }
        );
      }

      // Verify organization was created
      if (!organization) {
        console.error('Organization creation returned no data');
        return NextResponse.json(
          { error: 'Organization creation failed - no data returned' },
          { status: 500 }
        );
      }
      console.log('Organization created:', organization);

      // Add admin as organization member
      console.log('Adding admin as organization member:', { 
        organization_id: organization.id, 
        user_id: user.id 
      });
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: organization.id,
          user_id: user.id
        });

      if (memberError) {
        console.error('Member creation error:', {
          message: memberError.message,
          details: memberError.details,
          hint: memberError.hint,
          code: memberError.code
        });
        
        // Cleanup the organization if member creation fails
        console.log('Cleaning up organization due to member creation failure');
        const { error: cleanupError } = await supabase
          .from('organizations')
          .delete()
          .eq('id', organization.id);
          
        if (cleanupError) {
          console.error('Failed to cleanup organization:', cleanupError);
        }
        
        return NextResponse.json(
          { error: `Failed to setup organization membership: ${memberError.message}` },
          { status: 500 }
        );
      }

      console.log('Admin registration completed successfully');
      return NextResponse.json({ 
        success: true,
        redirectTo: '/protected/inbox'
      });
    } 
    else if (role === 'agent' && inviteCode) {
      // Verify and process invite code
      const { data: invite } = await supabase
        .from('organization_invites')
        .select('organization_id')
        .eq('code', inviteCode)
        .single();

      if (invite) {
        // Check if already a member
        const { data: existingMember } = await supabase
          .from('organization_members')
          .select('id')
          .eq('user_id', user.id)
          .eq('organization_id', invite.organization_id)
          .single();

        if (!existingMember) {
          const { error: memberError } = await supabase
            .from('organization_members')
            .insert({
              organization_id: invite.organization_id,
              user_id: user.id
            });

          if (memberError) {
            return NextResponse.json(
              { error: 'Failed to join organization' },
              { status: 500 }
            );
          }
        }
      }
    }

    // Default redirect for non-admin roles
    return NextResponse.json({ 
      success: true,
      redirectTo: '/protected/inbox'
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 