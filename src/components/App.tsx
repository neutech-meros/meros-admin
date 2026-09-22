'use client';

import { useEffect } from 'react';

import { useTranslation } from 'react-i18next';

import { useAtom } from 'jotai';

import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { counterAtom } from '@/store/atoms/counter';
import { languageAtom } from '@/store/atoms/language';

export function App() {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useAtom(languageAtom);
  const [counter, setCounter] = useAtom(counterAtom);

  useEffect(() => {
    i18n.changeLanguage(language);
  }, [i18n, language]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              {t('hello', { name: t('app.title') })}
            </CardTitle>
            <CardDescription className="text-center">{t('app.description')}</CardDescription>
          </CardHeader>
        </Card>

        {/* Language Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('language.title')}</CardTitle>
            <CardDescription>{t('language.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => handleLanguageChange('pt')}
                variant={language === 'pt' ? 'default' : 'outline'}
                size="sm"
              >
                {t('language.portuguese')}
                {language === 'pt' && (
                  <Badge variant="secondary" className="ml-2">
                    {t('language.active')}
                  </Badge>
                )}
              </Button>
              <Button
                onClick={() => handleLanguageChange('en')}
                variant={language === 'en' ? 'default' : 'outline'}
                size="sm"
              >
                {t('language.english')}
                {language === 'en' && (
                  <Badge variant="secondary" className="ml-2">
                    {t('language.active')}
                  </Badge>
                )}
              </Button>
              <Button
                onClick={() => handleLanguageChange('es')}
                variant={language === 'es' ? 'default' : 'outline'}
                size="sm"
              >
                {t('language.spanish')}
                {language === 'es' && (
                  <Badge variant="secondary" className="ml-2">
                    {t('language.active')}
                  </Badge>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Counter Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('counter.title')}</CardTitle>
            <CardDescription>{t('counter.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <Badge variant="outline" className="text-2xl px-4 py-2">
                  {counter}
                </Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-center gap-4">
                <Button onClick={() => setCounter((c) => c - 1)} variant="destructive" size="lg">
                  {t('counter.decrement')}
                </Button>

                <Button onClick={() => setCounter(0)} variant="outline" size="lg">
                  {t('counter.reset')}
                </Button>

                <Button onClick={() => setCounter((c) => c + 1)} variant="default" size="lg">
                  {t('counter.increment')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Components Demo Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t('components.title')}</CardTitle>
            <CardDescription>{t('components.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">{t('components.buttonVariations')}</h4>
                <div className="flex flex-wrap gap-2">
                  <Button variant="default" size="sm">
                    {t('components.buttons.default')}
                  </Button>
                  <Button variant="secondary" size="sm">
                    {t('components.buttons.secondary')}
                  </Button>
                  <Button variant="outline" size="sm">
                    {t('components.buttons.outline')}
                  </Button>
                  <Button variant="ghost" size="sm">
                    {t('components.buttons.ghost')}
                  </Button>
                  <Button variant="link" size="sm">
                    {t('components.buttons.link')}
                  </Button>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">{t('components.badgeVariations')}</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge>{t('components.badges.default')}</Badge>
                  <Badge variant="secondary">{t('components.badges.secondary')}</Badge>
                  <Badge variant="outline">{t('components.badges.outline')}</Badge>
                  <Badge variant="destructive">{t('components.badges.destructive')}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </div>
  );
}
