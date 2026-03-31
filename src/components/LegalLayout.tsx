import React from 'react';

const LegalLayout = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8 font-sans text-foreground">
    <div className="max-w-3xl mx-auto bg-card p-8 sm:p-12 shadow-sm rounded-xl border border-border/50">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-8 border-b pb-4">{title}</h1>
      <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground">
        {children}
      </div>
      <div className="mt-12 pt-8 border-t border-border/50 text-sm text-muted-foreground">
        <p>© 2026 Creeda Performance — A Sole Proprietorship. All rights reserved.</p>
        <p>11 Rajsi Mansion, 4th Pasta Lane, Colaba, Mumbai - 400005, India</p>
      </div>
    </div>
  </div>
);

export default LegalLayout;
