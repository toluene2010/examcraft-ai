import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  convertInchesToTwip,
  PageBreak
} from 'docx';
import { saveAs } from 'file-saver';
import { ExamMetadata, ExamPrintConfig, ExamQuestion } from '../types/exam';

export async function exportExamToWord(
  metadata: ExamMetadata,
  questions: ExamQuestion[],
  config: ExamPrintConfig
) {
  const totalCalculatedMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

  const docChildren: any[] = [];

  // Institution Header
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [
        new TextRun({
          text: (metadata.institutionName || 'INSTITUTION EXAMINATION BOARD').toUpperCase(),
          bold: true,
          size: 28, // 14pt
          font: 'Times New Roman'
        })
      ]
    })
  );

  // Department
  if (metadata.department) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: metadata.department.toUpperCase(),
            bold: true,
            size: 22,
            font: 'Times New Roman'
          })
        ]
      })
    );
  }

  // Exam Title
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [
        new TextRun({
          text: (metadata.examTitle || 'SEMESTER EXAMINATION').toUpperCase(),
          bold: true,
          size: 24, // 12pt
          font: 'Times New Roman'
        })
      ]
    })
  );

  // Academic Year / Term
  if (metadata.academicYear) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: metadata.academicYear,
            italics: true,
            size: 20,
            font: 'Times New Roman'
          })
        ]
      })
    );
  }

  // Meta Table: Subject, Grade, Duration, Total Marks
  const metaTable = new Table({
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'SUBJECT: ', bold: true, size: 20 }),
                  new TextRun({ text: (metadata.subject || 'GENERAL').toUpperCase(), size: 20 })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'CLASS / LEVEL: ', bold: true, size: 20 }),
                  new TextRun({ text: (metadata.gradeLevel || '').toUpperCase(), size: 20 })
                ]
              })
            ]
          })
        ]
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: 'TIME ALLOWED: ', bold: true, size: 20 }),
                  new TextRun({ text: `${metadata.durationMinutes || 60} MINUTES`, size: 20 })
                ]
              })
            ]
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({ text: 'TOTAL MARKS: ', bold: true, size: 20 }),
                  new TextRun({ text: `${totalCalculatedMarks} MARKS`, size: 20 })
                ]
              })
            ]
          })
        ]
      })
    ]
  });
  docChildren.push(metaTable);

  // Student Info Box (if enabled)
  if (metadata.enableStudentInfoBox) {
    docChildren.push(
      new Paragraph({ spacing: { before: 180, after: 60 } }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'CANDIDATE NAME: ________________________________________', size: 19 })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'ROLL NO / ID: ______________________', size: 19 })
                    ]
                  })
                ]
              })
            ]
          }),
          new TableRow({
            children: [
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'DATE: __________________________________________________', size: 19 })
                    ]
                  })
                ]
              }),
              new TableCell({
                width: { size: 50, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({ text: 'SIGNATURE: ________________________', size: 19 })
                    ]
                  })
                ]
              })
            ]
          })
        ]
      })
    );
  }

  // General Instructions
  if (metadata.instructions && metadata.instructions.length > 0) {
    docChildren.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [
          new TextRun({
            text: 'GENERAL INSTRUCTIONS TO CANDIDATES:',
            bold: true,
            size: 20,
            underline: {}
          })
        ]
      })
    );
    metadata.instructions.forEach((inst, idx) => {
      docChildren.push(
        new Paragraph({
          spacing: { after: 40 },
          indent: { left: 360 },
          children: [
            new TextRun({ text: `${idx + 1}. `, bold: true, size: 20 }),
            new TextRun({ text: inst, size: 20 })
          ]
        })
      );
    });
  }

  // Divider
  docChildren.push(
    new Paragraph({
      spacing: { before: 140, after: 200 },
      border: {
        bottom: { color: '000000', space: 1, style: BorderStyle.SINGLE, size: 6 }
      }
    })
  );

  // QUESTIONS SECTION
  if (config.printMode !== 'answers_only') {
    questions.forEach((q, idx) => {
      // Question prompt
      docChildren.push(
        new Paragraph({
          spacing: { before: 120, after: 60 },
          children: [
            new TextRun({ text: `${q.number}.  `, bold: true, size: 22 }),
            new TextRun({ text: q.question, size: 22 }),
            new TextRun({ text: `   [${q.marks} Mark${q.marks === 1 ? '' : 's'}]`, bold: true, italics: true, size: 18 })
          ]
        })
      );

      // Options if MCQ or True/False
      if ((q.type === 'multiple_choice' || q.type === 'true_false') && q.options) {
        q.options.forEach((opt) => {
          docChildren.push(
            new Paragraph({
              indent: { left: 720 },
              spacing: { after: 40 },
              children: [
                new TextRun({ text: opt, size: 21 })
              ]
            })
          );
        });
      }

      // Dotted answer lines for students if theory
      if (config.showAnswerLinesForTheory && (q.type === 'short_answer' || q.type === 'essay' || q.type === 'fill_blank')) {
        const lineCount = q.type === 'essay' ? 4 : config.answerLinesCount || 2;
        for (let l = 0; l < lineCount; l++) {
          docChildren.push(
            new Paragraph({
              spacing: { before: 60, after: 60 },
              indent: { left: 720 },
              children: [
                new TextRun({
                  text: '................................................................................................................................................',
                  color: '888888',
                  size: 16
                })
              ]
            })
          );
        }
      }

      // If questionsPerPage is specified and we reached the page threshold (and not the last question)
      if (config.questionsPerPage && config.questionsPerPage > 0 && (idx + 1) % config.questionsPerPage === 0 && idx < questions.length - 1) {
        docChildren.push(new Paragraph({ children: [new PageBreak()] }));
      }
    });
  }

  // ANSWER KEY & MARKING SCHEME (PLACED AT THE END)
  if (config.printMode !== 'student_only') {
    if (config.answerKeyOnNewPage) {
      docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    } else {
      docChildren.push(
        new Paragraph({
          spacing: { before: 400, after: 200 },
          border: {
            top: { color: '000000', space: 2, style: BorderStyle.DASHED, size: 6 }
          }
        })
      );
    }

    // Answer Key Header
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({
            text: 'OFFICIAL EXAMINATION MARKING SCHEME & ANSWER KEY',
            bold: true,
            size: 24,
            underline: {}
          })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: `${metadata.examTitle} • ${metadata.subject} • (Total: ${totalCalculatedMarks} Marks)`,
            italics: true,
            size: 20
          })
        ]
      })
    );

    // Rapid grading matrix summary table
    const tableRows: TableRow[] = [];
    let currentRowCells: TableCell[] = [];

    questions.forEach((q, idx) => {
      currentRowCells.push(
        new TableCell({
          width: { size: 25, type: WidthType.PERCENTAGE },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: `Q${q.number}: `, bold: true, size: 18 }),
                new TextRun({ text: q.answer.length > 20 ? q.answer.substring(0, 18) + '...' : (q.answer || '—'), size: 18 })
              ]
            })
          ]
        })
      );

      if (currentRowCells.length === 4 || idx === questions.length - 1) {
        // pad if last row has less than 4
        while (currentRowCells.length < 4) {
          currentRowCells.push(
            new TableCell({
              width: { size: 25, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [] })]
            })
          );
        }
        tableRows.push(new TableRow({ children: currentRowCells }));
        currentRowCells = [];
      }
    });

    if (tableRows.length > 0) {
      docChildren.push(
        new Paragraph({
          spacing: { after: 80 },
          children: [new TextRun({ text: 'RAPID GRADING MATRIX:', bold: true, size: 20 })]
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: tableRows
        }),
        new Paragraph({ spacing: { after: 180 } })
      );
    }

    // Detailed answers
    docChildren.push(
      new Paragraph({
        spacing: { before: 140, after: 100 },
        children: [
          new TextRun({ text: 'COMPREHENSIVE SOLUTIONS & MARKING RUBRIC:', bold: true, size: 22 })
        ]
      })
    );

    questions.forEach((q) => {
      docChildren.push(
        new Paragraph({
          spacing: { before: 100, after: 40 },
          children: [
            new TextRun({ text: `Question ${q.number} `, bold: true, size: 21 }),
            new TextRun({ text: `(${q.marks} Mark${q.marks === 1 ? '' : 's'}): `, bold: true, size: 21 }),
            new TextRun({ text: q.answer || 'Refer to syllabus guide', bold: true, color: '006600', size: 21 })
          ]
        })
      );

      if (q.explanation) {
        docChildren.push(
          new Paragraph({
            indent: { left: 360 },
            spacing: { after: 60 },
            children: [
              new TextRun({ text: 'Marking Rubric / Explanation: ', italics: true, color: '555555', size: 19 }),
              new TextRun({ text: q.explanation, italics: true, color: '333333', size: 19 })
            ]
          })
        );
      }
    });

    // End of Exam
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 200 },
        children: [
          new TextRun({
            text: '*** END OF EXAMINATION PAPER ***',
            bold: true,
            size: 20
          })
        ]
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(0.6),
              right: convertInchesToTwip(0.6),
              bottom: convertInchesToTwip(0.6),
              left: convertInchesToTwip(0.6)
            }
          }
        },
        children: docChildren
      }
    ]
  });

  const blob = await docxBlob(doc);
  const cleanFilename = `${(metadata.subject || 'Exam').replace(/[^a-z0-9]/gi, '_')}_Paper.docx`;
  saveAs(blob, cleanFilename);
}

async function docxBlob(doc: Document): Promise<Blob> {
  const { Packer } = await import('docx');
  return await Packer.toBlob(doc);
}

export async function exportExamToPDF(
  element: HTMLElement,
  filename: string = 'Examination_Paper.pdf'
) {
  const html2pdf = (await import('html2pdf.js')).default;
  const opt: any = {
    margin: [10, 10, 10, 10] as [number, number, number, number], // mm
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      letterRendering: true,
      scrollY: 0
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy']
    }
  };

  await html2pdf().set(opt).from(element).save();
}
