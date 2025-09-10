// File Generation Service - Handles writing generated widget files to the filesystem
export interface GeneratedFile {
  path: string;
  content: string;
}

export interface FileGenerationResult {
  success: boolean;
  message: string;
  writtenFiles: string[];
  errors?: Array<{
    file: string;
    error: string;
  }>;
}

class FileGenerationService {
  private baseDir = '/Users/ps/bizos3/src';

  /**
   * Writes generated widget files to the filesystem
   */
  async writeWidgetFiles(files: GeneratedFile[]): Promise<FileGenerationResult> {
    const writtenFiles: string[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    for (const file of files) {
      try {
        const fullPath = this.getFullPath(file.path);
        
        // Validate the file content before writing
        const validation = this.validateFileContent(file.path, file.content);
        if (!validation.valid) {
          errors.push({
            file: file.path,
            error: `Validation failed: ${validation.reason}`
          });
          continue;
        }

        // Write the file
        await this.writeFile(fullPath, file.content);
        writtenFiles.push(file.path);
        
        console.log(`✅ Generated: ${file.path}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push({
          file: file.path,
          error: errorMessage
        });
        console.error(`❌ Failed to write ${file.path}:`, error);
      }
    }

    const success = writtenFiles.length > 0 && errors.length === 0;
    
    return {
      success,
      message: success 
        ? `Successfully generated ${writtenFiles.length} files`
        : `Generated ${writtenFiles.length} files with ${errors.length} errors`,
      writtenFiles,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Updates widget registry files to include the new widget
   */
  async updateWidgetRegistry(widgetType: string, widgetTitle: string): Promise<void> {
    // Update WidgetContainer.tsx to import and render the new widget
    await this.updateWidgetContainer(widgetType, widgetTitle);
    
    // Update widget types
    await this.updateWidgetTypes(widgetType);
    
    // Update WidgetLibrary.tsx to make it selectable
    await this.updateWidgetLibrary(widgetType, widgetTitle);
    
    console.log(`✅ Updated widget registry for: ${widgetType}`);
  }

  /**
   * Validates file content before writing
   */
  private validateFileContent(filePath: string, content: string): { valid: boolean; reason?: string } {
    // Basic validation checks
    if (!content.trim()) {
      return { valid: false, reason: 'Empty file content' };
    }

    // TypeScript/React validation
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      // Check for basic TypeScript syntax
      if (!content.includes('export') && !filePath.includes('types/')) {
        return { valid: false, reason: 'TypeScript file missing exports' };
      }

      // Widget component validation
      if (filePath.includes('widgets/') && filePath.endsWith('.tsx')) {
        if (!content.includes('WidgetProps') && !content.includes('interface')) {
          return { valid: false, reason: 'Widget component missing proper props interface' };
        }
        if (!content.includes('React')) {
          return { valid: false, reason: 'Widget component missing React import' };
        }
      }

      // Service file validation
      if (filePath.includes('services/') && filePath.endsWith('.ts')) {
        if (!content.includes('export') || content.includes('<')) {
          return { valid: false, reason: 'Service file appears to contain JSX or missing exports' };
        }
      }
    }

    return { valid: true };
  }

  private getFullPath(relativePath: string): string {
    // Remove 'src/' prefix if present since we add it in baseDir
    const cleanPath = relativePath.startsWith('src/') ? relativePath.slice(4) : relativePath;
    return `${this.baseDir}/${cleanPath}`;
  }

  private async writeFile(fullPath: string, content: string): Promise<void> {
    // This would use Node.js fs in a real environment
    // For browser context, we'll simulate with a File System Access API approach
    // or use a mock implementation that shows what would be written
    
    try {
      // In a real implementation, you'd use:
      // import { promises as fs } from 'fs';
      // import path from 'path';
      // await fs.mkdir(path.dirname(fullPath), { recursive: true });
      // await fs.writeFile(fullPath, content, 'utf8');
      
      // For now, we'll log what would be written and store in localStorage for demo
      const fileKey = `generated_file_${fullPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      localStorage.setItem(fileKey, content);
      
      // Also store a manifest of generated files
      const manifestKey = 'generated_files_manifest';
      const existing = JSON.parse(localStorage.getItem(manifestKey) || '[]');
      const updated = [...existing.filter((f: any) => f.path !== fullPath), { 
        path: fullPath, 
        timestamp: new Date().toISOString(),
        size: content.length 
      }];
      localStorage.setItem(manifestKey, JSON.stringify(updated));
      
    } catch (error) {
      throw new Error(`Failed to write file ${fullPath}: ${error}`);
    }
  }

  private async updateWidgetContainer(widgetType: string, widgetTitle: string): Promise<void> {
    const componentName = `${widgetTitle.replace(/\s+/g, '')}Widget`;
    const importPath = `./widgets/${componentName}`;
    
    // In a real implementation, you would:
    // 1. Read the existing WidgetContainer.tsx file
    // 2. Add the import statement
    // 3. Add the case in the switch statement
    // 4. Write back to the file
    
    const updateInfo = {
      file: 'src/components/WidgetContainer.tsx',
      changes: [
        {
          type: 'import',
          line: `import { ${componentName} } from '${importPath}';`
        },
        {
          type: 'case',
          line: `case '${widgetType}': return <${componentName} {...widgetProps} isExpanded={isExpanded} onToggleExpanded={onToggleExpanded} />;`
        }
      ]
    };
    
    // Store the update plan
    localStorage.setItem(`widget_update_plan_${widgetType}`, JSON.stringify(updateInfo));
  }

  private async updateWidgetTypes(widgetType: string): Promise<void> {
    // Add the new widget type to the WidgetType union
    const updateInfo = {
      file: 'src/types/widget.ts',
      changes: [
        {
          type: 'type_addition',
          line: `| '${widgetType}'`
        }
      ]
    };
    
    localStorage.setItem(`types_update_plan_${widgetType}`, JSON.stringify(updateInfo));
  }

  private async updateWidgetLibrary(widgetType: string, widgetTitle: string): Promise<void> {
    // Add the widget to the widget library templates
    const updateInfo = {
      file: 'src/components/WidgetLibrary.tsx',
      changes: [
        {
          type: 'template_addition',
          data: {
            type: widgetType,
            title: widgetTitle,
            description: `AI-generated ${widgetTitle.toLowerCase()}`,
            icon: 'Bot', // Default icon for AI-generated widgets
            category: 'AI Generated'
          }
        }
      ]
    };
    
    localStorage.setItem(`library_update_plan_${widgetType}`, JSON.stringify(updateInfo));
  }

  /**
   * Gets all generated files for debugging/review
   */
  getGeneratedFiles(): Array<{ path: string; content: string; timestamp: string }> {
    const manifest = JSON.parse(localStorage.getItem('generated_files_manifest') || '[]');
    
    return manifest.map((file: any) => {
      const fileKey = `generated_file_${file.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const content = localStorage.getItem(fileKey) || '';
      
      return {
        path: file.path,
        content,
        timestamp: file.timestamp
      };
    });
  }

  /**
   * Clears all generated files (for development/testing)
   */
  clearGeneratedFiles(): void {
    const manifest = JSON.parse(localStorage.getItem('generated_files_manifest') || '[]');
    
    manifest.forEach((file: any) => {
      const fileKey = `generated_file_${file.path.replace(/[^a-zA-Z0-9]/g, '_')}`;
      localStorage.removeItem(fileKey);
    });
    
    localStorage.removeItem('generated_files_manifest');
    
    // Clear update plans
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('_update_plan_') || key.includes('types_update_plan_') || key.includes('library_update_plan_')) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Gets update plans for manual review/application
   */
  getUpdatePlans(): Array<{ widgetType: string; plan: any }> {
    const keys = Object.keys(localStorage);
    const plans: Array<{ widgetType: string; plan: any }> = [];
    
    keys.forEach(key => {
      if (key.startsWith('widget_update_plan_')) {
        const widgetType = key.replace('widget_update_plan_', '');
        const plan = JSON.parse(localStorage.getItem(key) || '{}');
        plans.push({ widgetType, plan });
      }
    });
    
    return plans;
  }
}

export const fileGenerationService = new FileGenerationService();
export default fileGenerationService;