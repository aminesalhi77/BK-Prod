// Modified: Added AI upload proxy route to handle multiple Excel file uploads and directory imports
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const directory = formData.get('directory') as string;

    if (!files && !directory) {
      return NextResponse.json({
        success: false,
        error: 'Veuillez sélectionner un ou plusieurs fichiers Excel (.xlsx) à importer.'
      }, { status: 400 });
    }

    const uploadDir = join(process.cwd(), 'bkfood_ai', 'exports');
    
    // Ensure upload directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    let importedFiles: string[] = [];

    if (directory) {
      // Handle directory import
      try {
        const directoryPath = join(process.cwd(), 'bkfood_ai', 'exports', directory);
        const filesInDir = await readdir(directoryPath);
        
        for (const fileName of filesInDir) {
          if (fileName.toLowerCase().endsWith('.xlsx')) {
            importedFiles.push(fileName);
          }
        }

        if (importedFiles.length === 0) {
          return NextResponse.json({
            success: false,
            error: `Aucun fichier Excel (.xlsx) trouvé dans le dossier "${directory}".`
          }, { status: 400 });
        }

      } catch (error) {
        return NextResponse.json({
          success: false,
          error: `Erreur lors de la lecture du dossier "${directory}". Vérifiez que le chemin est correct.`
        }, { status: 500 });
      }
    } else if (files && files.length > 0) {
      // Handle individual file uploads
      for (const file of files) {
        // Validate file extension
        const fileName = file.name;
        if (!fileName.toLowerCase().endsWith('.xlsx')) {
          return NextResponse.json({
            success: false,
            error: `Format de fichier invalide pour "${fileName}". Seuls les fichiers Excel (.xlsx) sont acceptés.`
          }, { status: 400 });
        }

        // Read file buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Save to bkfood_ai/exports/ directory
        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, buffer);
        importedFiles.push(fileName);
      }
    }

    return NextResponse.json({
      success: true,
      filenames: importedFiles,
      message: directory 
        ? `Dossier "${directory}" importé avec succès. ${importedFiles.length} fichiers Excel trouvés.`
        : `Fichiers importés avec succès: ${importedFiles.join(', ')}`
    });
  } catch (error) {
    console.error('[ai-upload]', error);
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de l\'importation des fichiers. Veuillez réessayer.'
    }, { status: 500 });
  }
}
