'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export function TermsDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasAccepted = localStorage.getItem('simusoul-terms-accepted');
    if (!hasAccepted) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('simusoul-terms-accepted', 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Important Disclaimers</h3>
              <ul className="space-y-2 text-muted-foreground">
                <li>• SimuSoul is for entertainment only - all personas are fictional AI</li>
                <li>• No medical, legal, or professional advice is provided</li>
                <li>• AI personas cannot discuss politics, LGBTQ+, abortion, religion, or medical topics</li>
                <li>• Always consult real professionals for serious matters</li>
                <li>• Must be 18+ to use this service</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Medical Disclaimer</h3>
              <p className="text-muted-foreground">
                SimuSoul does not provide medical advice. Even "doctor" personas are fictional and cannot give real medical guidance. 
                Always consult qualified healthcare professionals for medical concerns.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Content Restrictions</h3>
              <p className="text-muted-foreground">
                AI personas will refuse to discuss sensitive topics including politics, social issues, LGBTQ+ topics, 
                reproductive issues, religion, and medical advice to ensure a safe experience.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Emergency Notice</h3>
              <p className="text-muted-foreground">
                For emergencies, contact 911 or local emergency services. SimuSoul cannot handle crisis situations.
              </p>
            </div>
          </div>
        </ScrollArea>
        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={handleAccept}>
            I Accept and Understand
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
