const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function initializePrompts() {
  try {
    console.log('🚀 Starting prompt initialization...');
    
    // Import the prompts from promptsV2
    const { DEFAULT_PROMPTS_V2 } = await import('./src/lib/promptsV2.ts');
    
    console.log(`📚 Found ${DEFAULT_PROMPTS_V2.length} default prompts`);
    
    // Find the new '객관식 일반형' prompt
    const newPrompt = DEFAULT_PROMPTS_V2.find(p => p.name === '객관식 일반형');
    
    if (!newPrompt) {
      console.error('❌ Could not find 객관식 일반형 prompt in DEFAULT_PROMPTS_V2');
      return;
    }
    
    console.log('✅ Found 객관식 일반형 prompt:', newPrompt.name);
    
    // Check if prompt already exists in database
    const { data: existingPrompt, error: checkError } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .eq('prompt_id', newPrompt.promptId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking for existing prompt:', checkError);
      return;
    }
    
    if (existingPrompt) {
      console.log('ℹ️ Prompt already exists, updating...');
      
      const { error: updateError } = await supabase
        .from('system_prompts_v3')
        .update({
          category: newPrompt.category,
          sub_category: newPrompt.subCategory,
          name: newPrompt.name,
          key: newPrompt.key,
          prompt_text: newPrompt.promptText,
          description: newPrompt.description,
          is_active: newPrompt.isActive,
          is_default: newPrompt.isDefault,
          version: newPrompt.version,
          updated_at: new Date().toISOString(),
          updated_by: 'system'
        })
        .eq('prompt_id', newPrompt.promptId);
      
      if (updateError) {
        console.error('❌ Error updating prompt:', updateError);
      } else {
        console.log('✅ Successfully updated 객관식 일반형 prompt');
      }
    } else {
      console.log('📝 Creating new prompt...');
      
      const { error: insertError } = await supabase
        .from('system_prompts_v3')
        .insert({
          prompt_id: newPrompt.promptId,
          category: newPrompt.category,
          sub_category: newPrompt.subCategory,
          name: newPrompt.name,
          key: newPrompt.key,
          prompt_text: newPrompt.promptText,
          description: newPrompt.description,
          is_active: newPrompt.isActive,
          is_default: newPrompt.isDefault,
          version: newPrompt.version,
          created_by: 'system',
          updated_by: 'system'
        });
      
      if (insertError) {
        console.error('❌ Error inserting prompt:', insertError);
      } else {
        console.log('✅ Successfully inserted 객관식 일반형 prompt');
      }
    }
    
    // Verify the prompt was saved
    const { data: verifyPrompt, error: verifyError } = await supabase
      .from('system_prompts_v3')
      .select('*')
      .eq('prompt_id', newPrompt.promptId)
      .single();
    
    if (verifyError) {
      console.error('❌ Error verifying prompt:', verifyError);
    } else {
      console.log('✅ Verification successful:');
      console.log('  - Prompt ID:', verifyPrompt.prompt_id);
      console.log('  - Name:', verifyPrompt.name);
      console.log('  - Category:', verifyPrompt.category);
      console.log('  - Sub Category:', verifyPrompt.sub_category);
      console.log('  - Key:', verifyPrompt.key);
      console.log('  - Active:', verifyPrompt.is_active);
    }
    
    console.log('🎉 Prompt initialization completed!');
    
  } catch (error) {
    console.error('❌ Error during initialization:', error);
  }
}

initializePrompts();