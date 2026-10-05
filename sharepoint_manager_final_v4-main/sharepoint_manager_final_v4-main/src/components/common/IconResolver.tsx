import React from 'react';
import * as Icons from 'lucide-react';

interface IconResolverProps {
  name: string;
  className?: string;
}

export const IconResolver: React.FC<IconResolverProps> = ({ name, className = 'w-5 h-5' }) => {
  const IconComponent = (Icons as any)[name] || Icons.Folder;
  return <IconComponent className={className} />;
};
